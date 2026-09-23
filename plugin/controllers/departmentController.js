import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maps specific symptom IDs to user-friendly symptom location labels
// so the result card shows "Mouth / Teeth" instead of the processing category "Head & Neck"
const SYMPTOM_AREA_LABELS = {
  // Head & Neck sub-areas
  toothache: 'Mouth / Teeth',
  mouth_ulcer: 'Mouth / Oral',
  gum_pain_swelling: 'Gums / Oral',
  loss_of_smell: 'Nose / Nasal',
  loss_of_taste: 'Mouth / Oral',
  difficulty_swallowing: 'Throat / Neck',
  headache: 'Head',
  migraine: 'Head',
  dizziness: 'Head',
  ear_pain: 'Ear',
  eye_pain: 'Eye',
  throat_pain: 'Throat',
  neck_pain: 'Neck',
  nasal_congestion: 'Nose / Sinuses',
  nosebleed: 'Nose',
  jaw_pain: 'Jaw / Face',
  common_cold: 'Head & Neck (Cold / Flu)',
  head_injury_trauma: 'Head',
  seizure: 'Brain / Nervous System',
  speech_difficulty: 'Brain / Nervous System',
  facial_weakness: 'Face / Nervous System',
  tremor: 'Nervous System',
  memory_confusion: 'Brain / Cognitive',
  // Chest
  chest_pain: 'Chest / Heart',
  breathing_difficulty: 'Chest / Lungs',
  palpitations: 'Chest / Heart',
  blood_in_sputum: 'Chest / Lungs',
  // Abdomen
  abdominal_pain: 'Abdomen',
  abdominal_cramps: 'Abdomen',
  blood_in_vomit: 'Stomach / GI',
  nausea_vomiting: 'Stomach',
  diarrhea: 'Digestive System',
  constipation: 'Digestive System',
  // Lower Abdomen
  pelvic_pain: 'Lower Abdomen / Pelvis',
  urinary_pain: 'Urinary System',
  urinary_incontinence: 'Urinary System',
  kidney_pain: 'Kidney / Back',
  // Skin
  skin_rash: 'Skin',
  itching: 'Skin',
  // Back
  back_pain: 'Back / Spine',
  // Arms
  arm_muscle_pain: 'Arm',
  arm_fracture_trauma: 'Arm',
  shoulder_pain: 'Shoulder',
  // Legs
  knee_pain: 'Knee',
  leg_fracture_trauma: 'Leg',
  ankle_pain: 'Ankle / Foot',
  foot_pain: 'Foot',
  // General
  fever: 'General / Systemic',
  fatigue: 'General / Systemic',
  weight_loss: 'General / Metabolic',
  weight_gain: 'General / Metabolic',
  joint_pain: 'Joints / Musculoskeletal',
  muscle_cramps: 'Muscles',
  swelling: 'Soft Tissue',
  hair_loss: 'Skin / Hair',
  excessive_sweating: 'General / Endocrine',
  excessive_sleepiness: 'General / Neurological',
  numbness_tingling: 'Nerves / Extremities',
  night_sweats: 'General / Systemic',
};

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
      followUpProfiles: departmentData.followUpProfiles || {},
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
      symptomArea: SYMPTOM_AREA_LABELS[symptomId] || areaConfig?.displayName || bodyArea,
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
    const { bodyArea, symptomId, duration, severity, profileAnswers = {} } = req.body;

    const areaConfig = departmentData.bodyParts?.[bodyArea];
    const symptom = areaConfig?.symptoms?.find(s => s.id === symptomId);

    // Check for acute red flags and urgency in profileAnswers dynamically
    let hasEmergencyFlag = false;
    let hasPriorityFlag = false;
    let profileNotes = [];

    const profile = departmentData.followUpProfiles?.[symptomId];
    if (profile && profile.questions) {
      for (const q of profile.questions) {
        const userAns = profileAnswers[q.id];
        if (!userAns) continue;
        const opt = q.options?.find(o => o.id === userAns || o.label === userAns);
        if (opt) {
          profileNotes.push(`${q.id.replace(/_/g, ' ')}: ${opt.label}`);
          if (opt.redFlag || opt.urgency === 'EMERGENCY') {
            hasEmergencyFlag = true;
          } else if (opt.urgency === 'PRIORITY') {
            hasPriorityFlag = true;
          }
        }
      }
    }

    const profileValues = Object.values(profileAnswers).flatMap(v => Array.isArray(v) ? v : [v]);
    if (!hasEmergencyFlag) {
      hasEmergencyFlag = profileValues.some(val =>
        ['blood_in_stool', 'cannot_keep_fluids', 'severe_abdominal_pain', 'radiation_sweats_sob',
          'pressure_exertion', 'swelling_lip_face_sob', 'blisters_peeling', 'breathlessness_stridor',
          'blood_in_sputum', 'vomiting_distension', 'rash_spots', 'rf_blood'].includes(val)
      );
    }
    if (!hasPriorityFlag) {
      hasPriorityFlag = profileValues.some(val =>
        ['sudden_hearing_loss', 'with_vertigo', 'fever_back_pain', 'blood_in_urine',
          'dark_urine_pale_stool', 'facial_swelling', 'high_fever', 'high_with_chills',
          'very_high_persistent', '7_plus', 'freq_severe'].includes(val)
      );
    }

    // If bodyArea not found, fallback to General Medicine
    if (!areaConfig) {
      return res.json({
        success: true,
        recommendation: {
          bodyArea: bodyArea || 'general',
          bodyAreaName: 'General / Multi-System',
          symptomId: symptomId || 'general_discomfort',
          symptomName: 'General Symptoms',
          department: 'General Medicine',
          altDepartment: 'Primary Care / Internal Medicine',
          urgency: hasEmergencyFlag ? 'EMERGENCY' : (hasPriorityFlag || severity === 'severe') ? 'PRIORITY' : 'ROUTINE',
          reason: 'Your symptoms involve generalized or non-localized discomfort. A General Medicine doctor will carry out initial triage, physical exams, and lab screening.',
          advice: 'Schedule an appointment with a primary care physician for a comprehensive health assessment.',
          duration: duration || 'Not specified',
          severity: severity || 'Not specified',
          isEmergency: hasEmergencyFlag,
          emergencyNotice: hasEmergencyFlag ? '🚨 CRITICAL ALERT: Your reported symptoms indicate potential acute medical urgency. Please visit the nearest Emergency Room immediately.' : null,
          clinicalContextNotes: profileNotes.length > 0 ? profileNotes.join('; ') : undefined,
          redFlagAlert: hasEmergencyFlag ? '🚨 Red Flag Detected: immediate evaluation recommended' : undefined
        }
      });
    }

    const isEmergency = Boolean(
      hasEmergencyFlag ||
      (symptom?.isRedFlagCandidate && severity === 'severe') ||
      (symptomId === 'chest_pain' && severity === 'severe') ||
      (symptomId === 'breathing_difficulty' && severity === 'severe') ||
      (symptomId === 'speech_difficulty') ||
      (symptomId === 'seizure') ||
      (symptomId === 'blood_in_vomit')
    );

    const isPriority = Boolean(
      hasPriorityFlag ||
      severity === 'moderate' ||
      severity === 'severe'
    );

    const urgency = isEmergency ? 'EMERGENCY' : isPriority ? 'PRIORITY' : 'ROUTINE';

    let customAdvice = symptom?.advice || 'Monitor your symptoms and schedule an appointment.';
    if (isEmergency) {
      customAdvice = '🚨 Seek prompt or emergency medical evaluation. Do not delay if symptoms worsen, or if chest pain, breathlessness, or severe dehydration are present.';
    }

    const recommendation = {
      bodyArea,
      bodyAreaName: areaConfig.displayName,
      symptomArea: SYMPTOM_AREA_LABELS[symptomId] || areaConfig.displayName,
      symptomId: symptom?.id || symptomId,
      symptomName: symptom?.label || symptomId,
      department: isEmergency && symptom?.isRedFlagCandidate ? (symptom?.department === 'Emergency Medicine' ? 'Emergency Medicine' : `${symptom?.department} / Emergency Medicine`) : (symptom?.department || 'General Medicine'),
      altDepartment: symptom?.altDepartment || null,
      urgency,
      urgencyLevel: urgency,
      emergency: isEmergency,
      primarySymptom: symptom?.label || symptomId,
      reason: symptom?.reason || 'A consultation will help evaluate your symptoms.',
      advice: customAdvice,
      duration: duration || 'Not specified',
      severity: severity || (profileValues.length > 0 ? 'Assessed via clinical questions' : 'Not specified'),
      profileAnswers,
      clinicalContextNotes: profileNotes.length > 0 ? profileNotes.join('; ') : undefined,
      redFlagAlert: hasEmergencyFlag ? '🚨 Red Flag Detected: immediate evaluation recommended' : undefined,
      isEmergency,
      emergencyNotice: isEmergency
        ? 'CRITICAL ALERT: Your selected symptoms indicate potential medical urgency. Please contact emergency services (108) or visit the nearest Emergency Room immediately.'
        : null
    };

    res.json({ success: true, recommendation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
