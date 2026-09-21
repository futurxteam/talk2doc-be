import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load department mapping from data/departmentMap.json
const dataPath = path.join(__dirname, '..', 'data', 'departmentMap.json');
let departmentData = {};

try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  departmentData = JSON.parse(rawData);
  console.log('[INFO] Department mapping loaded successfully in departmentController.');
} catch (err) {
  console.error('[ERROR] Failed to load departmentMap.json:', err.message);
}

// ─── Decision Tree Helpers ───────────────────────────────────────────────────

/**
 * Evaluate one node of a decision tree given the user's answer(s).
 */
export function evaluateNode(tree, nodeId, answers) {
  const node = tree.nodes[nodeId];
  if (!node) return null;
  const logic = node.logic;

  if (node.type === 'multi_select') {
    const selected = Array.isArray(answers) ? answers.filter(a => a !== 'none') : [];
    if (selected.length > 0 && logic.if_any_except_none) return logic.if_any_except_none;
    if (selected.length === 0 && logic.if_none_or_only_none) return logic.if_none_or_only_none;
    if (logic.if_2_or_more_except_none && selected.length >= 2) return logic.if_2_or_more_except_none;
    if (logic.if_less_than_2_or_only_none && selected.length < 2) return logic.if_less_than_2_or_only_none;
  }

  if (node.type === 'single_select') {
    const answer = Array.isArray(answers) ? answers[0] : answers;
    if (logic[answer]) return logic[answer];
  }

  return null;
}

/**
 * Walk the entire decision tree given a full answersMap { nodeId: answer(s) }.
 */
export function resolveDecisionTree(treeId, answersMap) {
  const tree = departmentData.decisionTrees?.[treeId];
  if (!tree) return null;

  let current = tree.startNode;
  const visited = new Set();

  while (current && !tree.outcomes[current]) {
    if (visited.has(current)) break;
    visited.add(current);
    const answers = answersMap[current];
    if (answers === undefined) break;
    const next = evaluateNode(tree, current, answers);
    if (!next) break;
    current = next;
  }

  return tree.outcomes[current] || null;
}

// ─── Controller Handlers ─────────────────────────────────────────────────────

/**
 * GET /api/bodyparts
 * Get all available body parts, symptoms, follow-up questions, and decision trees
 */
export const getBodyParts = (req, res) => {
  try {
    res.json({
      success: true,
      data: departmentData.bodyParts || {},
      followUpQuestions: departmentData.followUpQuestions || {},
      decisionTrees: departmentData.decisionTrees || {}
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/triage
 * Walk a decision tree with an answersMap and return clinical outcome,
 * or fallback to General Medicine if unresolved/ambiguous
 */
export const triageDecisionTree = (req, res) => {
  try {
    const { bodyArea, symptomId, treeId, answersMap = {} } = req.body || {};

    const outcome = treeId ? resolveDecisionTree(treeId, answersMap) : null;
    const areaConfig = departmentData.bodyParts?.[bodyArea];
    const symptom = areaConfig?.symptoms?.find(s => s.id === symptomId);

    // If unresolved or ambiguous, fallback safely to General Medicine or symptom department
    if (!outcome) {
      return res.json({
        success: true,
        recommendation: {
          bodyArea: bodyArea || 'general',
          bodyAreaName: areaConfig?.displayName || 'General / Multi-System',
          symptomId: symptomId || 'general_symptom',
          symptomName: symptom?.label || 'General Discomfort',
          department: symptom?.department || 'General Medicine',
          altDepartment: symptom?.altDepartment || 'Primary Care / Family Physician',
          urgency: 'ROUTINE',
          reason: symptom?.reason || 'An initial physical examination and routine evaluation by a General Medicine physician is recommended.',
          advice: symptom?.advice || 'Consult a primary care physician for clinical evaluation.',
          isEmergency: false,
          emergencyNotice: null
        }
      });
    }


    const recommendation = {
      bodyArea,
      bodyAreaName: areaConfig?.displayName || bodyArea,
      symptomId,
      symptomName: symptom?.label || symptomId,
      department: outcome.department || 'General Medicine',
      altDepartment: outcome.altDepartment || null,
      urgency: outcome.urgency || 'ROUTINE',
      reason: outcome.reason || 'A clinical evaluation will assist in triaging your symptoms.',
      advice: outcome.advice || 'Consult a healthcare professional for guidance.',
      isEmergency: outcome.urgency === 'EMERGENCY',
      emergencyNotice: outcome.emergencyNotice || null
    };

    res.json({ success: true, recommendation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/recommend
 * Simple triage recommendation: bodyArea + symptomId + duration + severity
 */
export const recommendDepartment = (req, res) => {
  try {
    const { bodyArea, symptomId, duration, severity } = req.body;

    const areaConfig = departmentData.bodyParts?.[bodyArea];
    const symptom = areaConfig?.symptoms?.find(s => s.id === symptomId) || areaConfig?.symptoms?.[0];

    // If bodyArea or symptom is not found or ambiguous, fallback to General Medicine
    if (!areaConfig || !symptom) {
      return res.json({
        success: true,
        recommendation: {
          bodyArea: bodyArea || 'general',
          bodyAreaName: areaConfig?.displayName || 'General / Multi-System',
          symptomId: symptomId || 'general_discomfort',
          symptomName: 'General Symptoms',
          department: 'General Medicine',
          altDepartment: 'Primary Care / Internal Medicine',
          urgency: severity === 'severe' ? 'PRIORITY' : 'ROUTINE',
          reason: 'Your symptoms involve generalized or non-localized discomfort. A General Medicine doctor will carry out initial triage, physical exams, and lab screening.',
          advice: 'Schedule an appointment with a primary care physician for a comprehensive health assessment.',
          duration: duration || 'Not specified',
          severity: severity || 'moderate',
          isEmergency: false,
          emergencyNotice: null
        }
      });
    }

    const isEmergency = Boolean(
      (symptom?.isRedFlagCandidate && severity === 'severe') ||
      (symptomId === 'chest_pain' && severity === 'severe') ||
      (symptomId === 'breathing_difficulty' && severity === 'severe')
    );

    const recommendation = {
      bodyArea,
      bodyAreaName: areaConfig.displayName,
      symptomId: symptom?.id,
      symptomName: symptom?.label,
      department: symptom?.department || 'General Medicine',
      altDepartment: symptom?.altDepartment || null,
      urgency: isEmergency ? 'EMERGENCY' : 'ROUTINE',
      reason: symptom?.reason || 'A consultation will help evaluate your symptoms.',
      advice: symptom?.advice || 'Monitor your symptoms and schedule an appointment.',
      duration: duration || 'Not specified',
      severity: severity || 'Not specified',
      isEmergency,
      emergencyNotice: isEmergency
        ? 'CRITICAL ALERT: Your selected symptoms indicate potential medical urgency. Please contact emergency services (108/911/112) or visit the nearest Emergency Room immediately.'
        : null
    };

    res.json({ success: true, recommendation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
