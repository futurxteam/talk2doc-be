import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load departmentMap.json from backend/plugin/data/departmentMap.json
const dataPath = path.join(__dirname, '..', 'data', 'departmentMap.json');
let departmentData = {};
try {
  const rawData = fs.readFileSync(dataPath, 'utf8');
  departmentData = JSON.parse(rawData);
} catch (err) {
  console.error('[AI Triage Controller] Failed to load departmentMap.json:', err.message);
}

// Dynamically load OpenAI if available in environment
let OpenAIClass = null;
let aiClient = null;

const getAiClient = async () => {
  if (aiClient) return aiClient;
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROK_API_KEY;
  if (!apiKey) return null;

  try {
    if (!OpenAIClass) {
      const openAiMod = await import('openai');
      OpenAIClass = openAiMod.OpenAI || openAiMod.default?.OpenAI || openAiMod.default;
    }
    const useGrok = Boolean(process.env.GROK_API_KEY && !process.env.OPENAI_API_KEY);
    aiClient = new OpenAIClass({
      apiKey,
      baseURL: useGrok ? 'https://api.x.ai/v1' : 'https://api.openai.com/v1',
    });
    return aiClient;
  } catch (err) {
    console.warn('[AI Triage Controller] OpenAI library not available, using heuristic fallback:', err.message);
    return null;
  }
};

const AI_MODEL = process.env.OPENAI_API_KEY
  ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
  : (process.env.GROK_MODEL || 'grok-beta');

// Comprehensive local synonym dictionary for zero-dependency / offline fallback
const LOCAL_BODY_AREAS = {
  head_and_neck: ['head', 'forehead', 'temple', 'neck', 'throat', 'eye', 'ear', 'face', 'cranial', 'scalp', 'jaw'],
  chest: ['chest', 'heart', 'lungs', 'ribs', 'breast', 'ribcage', 'sternum', 'breathing', 'breath'],
  abdomen: ['stomach', 'tummy', 'belly', 'abdomen', 'digestive', 'gut', 'epigastric', 'navel'],
  lower_abdomen: ['lower abdomen', 'lower belly', 'pelvis', 'groin', 'bladder', 'urinary', 'urine', 'pee', 'period', 'menstrual', 'testicular', 'cramps'],
  left_arm: ['left arm', 'left shoulder', 'left hand', 'left wrist', 'left elbow', 'arm', 'shoulder', 'hand', 'elbow', 'wrist'],
  right_arm: ['right arm', 'right shoulder', 'right hand', 'right wrist', 'right elbow'],
  left_leg: ['left leg', 'left knee', 'left foot', 'left ankle', 'leg', 'knee', 'foot', 'ankle', 'thigh', 'calf', 'walking'],
  right_leg: ['right leg', 'right knee', 'right foot', 'right ankle'],
  skin: ['skin', 'rash', 'dermal', 'cutaneous', 'spots', 'itching', 'itchy', 'hives', 'acne', 'pimple'],
  back: ['back', 'spine', 'lower back', 'upper back', 'vertebrae', 'spinal', 'lumbago']
};

const LOCAL_DURATION_KEYWORDS = {
  hours: ['since last night', 'since morning', 'just started', 'less than 24', 'few hours', 'today', 'morning', 'hours', 'hour', 'recently', 'sudden'],
  days: ['since yesterday', 'three days', '3 days', 'two days', '2 days', 'four days', '4 days', 'couple of days', 'couple days', 'few days', 'yesterday', 'days', 'day'],
  weeks: ['1 to 3 weeks', 'two weeks', '2 weeks', 'three weeks', '3 weeks', 'few weeks', '1 week', 'one week', 'weeks', 'week', 'fortnight'],
  chronic: ['more than a month', 'several months', 'long time', 'chronic', 'ongoing', 'months', 'month', 'years', 'year', 'always']
};

const LOCAL_SEVERITY_KEYWORDS = {
  mild: ['mild', 'slight', 'minor', 'little', 'tolerable', 'bearable', 'light', 'a bit'],
  moderate: ['moderate', 'medium', 'uncomfortable', 'somewhat bad', 'bothersome', 'disrupts'],
  severe: ['severe', 'really bad', 'very bad', 'terrible', 'unbearable', 'excruciating', 'extreme', 'killing me', 'horrible', 'intense', 'pounding', 'debilitating']
};

/**
 * Heuristic fallback extraction when LLM is offline or no API key is provided
 */
function heuristicExtract(message, currentStep, currentContext = {}) {
  const text = (message || '').toLowerCase();

  // 1. Duration
  let durationId = null;
  let durationText = null;
  for (const [durKey, words] of Object.entries(LOCAL_DURATION_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(w)) {
        durationId = durKey;
        durationText = w;
        break;
      }
    }
    if (durationId) break;
  }

  // 2. Severity
  let severityId = null;
  let severityText = null;
  for (const [sevKey, words] of Object.entries(LOCAL_SEVERITY_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(w)) {
        severityId = sevKey;
        severityText = w;
        break;
      }
    }
    if (severityId) break;
  }

  // 3. Body Area & Symptom
  let matchedBodyArea = currentContext.bodyArea || null;
  let matchedSymptomId = currentContext.symptomId || null;
  let matchedSymptomName = null;
  const extraSymptoms = [];

  const bodyParts = departmentData.bodyParts || {};

  // Check each symptom label & id in departmentData
  for (const [areaKey, areaData] of Object.entries(bodyParts)) {
    for (const symp of areaData.symptoms || []) {
      const sympIdClean = symp.id.replace(/_/g, ' ');
      const sympLabelClean = (symp.label || '').toLowerCase();

      // Check for exact mention of symptom name or keywords
      if (text.includes(sympIdClean) || text.includes(sympLabelClean)) {
        if (!matchedSymptomId) {
          matchedSymptomId = symp.id;
          matchedSymptomName = symp.label;
          matchedBodyArea = areaKey;
        } else if (symp.id !== matchedSymptomId && !extraSymptoms.includes(symp.label)) {
          extraSymptoms.push(symp.label);
        }
      }
    }
  }

  // Extra common symptom checks
  if (text.includes('headache') || text.includes('head ache') || text.includes('migraine') || text.includes('head hurts') || text.includes('pounding head')) {
    if (!matchedSymptomId) {
      matchedBodyArea = 'head_and_neck';
      matchedSymptomId = 'headache';
      matchedSymptomName = 'Headache / Migraine';
    }
  }
  if (text.includes('dizzy') || text.includes('dizziness') || text.includes('vertigo')) {
    if (!matchedSymptomId) {
      matchedBodyArea = 'head_and_neck';
      matchedSymptomId = 'dizziness';
      matchedSymptomName = 'Dizziness / Vertigo';
    } else if (!extraSymptoms.includes('dizziness')) {
      extraSymptoms.push('dizziness');
    }
  }
  if (text.includes('stomach') || text.includes('belly') || text.includes('abdominal') || text.includes('tummy') || text.includes('gut')) {
    if (!matchedBodyArea) matchedBodyArea = 'abdomen';
    if (!matchedSymptomId) {
      matchedSymptomId = 'abdominal_pain';
      matchedSymptomName = 'Stomach / Abdominal Pain';
    }
  }
  if (text.includes('chest pain') || text.includes('chest hurts') || text.includes('tightness in chest')) {
    matchedBodyArea = 'chest';
    matchedSymptomId = 'chest_pain';
    matchedSymptomName = 'Chest Pain / Heavy Pressure';
  }

  // If no symptom yet, try to detect body area from general keywords
  if (!matchedBodyArea) {
    for (const [areaKey, words] of Object.entries(LOCAL_BODY_AREAS)) {
      if (words.some(w => text.includes(w))) {
        matchedBodyArea = areaKey;
        break;
      }
    }
  }

  // Check if currentStep is duration or severity
  if (currentStep === 'duration' && durationId) {
    return {
      source: 'heuristic_fallback',
      intent: 'ANSWER_QUESTION',
      extracted: {
        bodyArea: matchedBodyArea,
        symptomId: matchedSymptomId,
        symptomName: matchedSymptomName,
        duration: durationText,
        durationId,
        severity: severityText,
        severityId,
        extraSymptoms
      },
      conversationalReply: `Got it, you've had this for ${durationText}.`,
      needsClarification: false
    };
  }

  if (currentStep === 'severity' && severityId) {
    return {
      source: 'heuristic_fallback',
      intent: 'ANSWER_QUESTION',
      extracted: {
        bodyArea: matchedBodyArea,
        symptomId: matchedSymptomId,
        symptomName: matchedSymptomName,
        duration: durationText,
        durationId,
        severity: severityText,
        severityId,
        extraSymptoms
      },
      conversationalReply: `Understood, noted as ${severityId} discomfort.`,
      needsClarification: false
    };
  }

  // Generate empathetic conversational reply
  let conversationalReply = '';
  if (matchedSymptomName) {
    const sevPhrase = severityId ? ` ${severityId}` : '';
    let durPhrase = '';
    if (durationText) {
      durPhrase = durationText.startsWith('since') ? ` ${durationText}` : ` for ${durationText}`;
    }
    const extraPhrase = extraSymptoms.length > 0 ? ` alongside ${extraSymptoms.join(', ')}` : '';
    conversationalReply = `I understand you are experiencing${sevPhrase} ${matchedSymptomName}${durPhrase}${extraPhrase}. Let's evaluate this safely.`;
  } else if (matchedBodyArea) {
    conversationalReply = `Got it, discomfort around your ${matchedBodyArea.replace(/_/g, ' ')}. Which specific symptom are you experiencing?`;
  } else {
    conversationalReply = `Thank you for sharing. Could you select your primary discomfort area or provide more details?`;
  }

  return {
    source: 'heuristic_fallback',
    intent: 'SYMPTOM_REPORT',
    extracted: {
      bodyArea: matchedBodyArea,
      symptomId: matchedSymptomId,
      symptomName: matchedSymptomName,
      duration: durationText,
      durationId,
      severity: severityText,
      severityId,
      extraSymptoms
    },
    conversationalReply,
    needsClarification: !matchedSymptomId && !matchedBodyArea
  };
}

/**
 * Controller handler for POST /api/ai/understand-symptoms
 */
export const understandSymptoms = async (req, res) => {
  try {
    const {
      message,
      currentStep = 'body_area',
      currentContext = {},
      language = 'en-IN'
    } = req.body;

    // Destructure rich context fields
    const {
      bodyArea: ctxBodyArea,
      symptomId: ctxSymptomId,
      symptomName: ctxSymptomName,
      duration: ctxDuration,
      severity: ctxSeverity,
      treeId: ctxTreeId,
      currentNodeId: ctxNodeId,
      answersMap: ctxAnswersMap = {},
      recentConversation = []
    } = currentContext;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const client = await getAiClient();

    // If no OpenAI/Grok key configured or library unavailable, use local heuristic extractor
    if (!client) {
      const fallbackResult = heuristicExtract(message, currentStep, currentContext);
      return res.json({
        success: true,
        ...fallbackResult
      });
    }

    // --- Change 2: Only send relevant symptoms based on current context body area ---
    // If user has already selected a body area, only show symptoms for that area.
    // Otherwise show a compact summary (id only) of all areas to keep token count low.
    let symptomSummary = '';
    if (ctxBodyArea && departmentData.bodyParts?.[ctxBodyArea]) {
      const areaData = departmentData.bodyParts[ctxBodyArea];
      const symps = (areaData.symptoms || []).map(s => `${s.id}: ${s.label}`).join(', ');
      symptomSummary = `CURRENT BODY AREA: ${ctxBodyArea} (${areaData.displayName})\nAVAILABLE SYMPTOMS: [${symps}]`;
    } else {
      // Compact all-areas listing (just ids to save tokens)
      const compact = Object.entries(departmentData.bodyParts || {}).map(([key, val]) => {
        const ids = (val.symptoms || []).map(s => s.id).join(', ');
        return `${key}: [${ids}]`;
      }).join(' | ');
      symptomSummary = `BODY AREAS & SYMPTOM IDS:\n${compact}`;
    }

    const durationOptions = (departmentData.followUpQuestions?.duration?.options || [])
      .map(o => `${o.id}: "${o.label}"`).join(', ');

    const severityOptions = (departmentData.followUpQuestions?.severity?.options || [])
      .map(o => `${o.id}: "${o.label}"`).join(', ');

    // Current node options if user is currently answering a decision tree node
    let activeQuestionContext = '';
    if (ctxTreeId && ctxNodeId) {
      const tree = departmentData.decisionTrees?.[ctxTreeId];
      const node = tree?.nodes?.[ctxNodeId];
      if (node) {
        const opts = (node.options || []).map(o => `${o.id}: "${o.label}"`).join(', ');
        activeQuestionContext = `
ACTIVE CLINICAL QUESTION:
Question ID: ${ctxNodeId}
Question Text: "${node.question}"
Type: ${node.type}
Options: [${opts}]
Analyze if user's input answers this question. If so, return decisionAnswer with nodeId and selectedOptionIds.
`;
      }
    }

    // --- Change 4: Build conversation history for LLM multi-turn context ---
    const conversationHistory = (recentConversation || []).map(turn => ({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.text || ''
    }));

    const systemPrompt = `You are an expert clinical triage NLP assistant for talk2doc.
Your goal is to parse a patient's natural language statement into structured clinical data.
The patient may speak Indian English or use informal terms.

CRITICAL INSTRUCTIONS:
1. Extract bodyArea and symptomId ONLY from the catalog below.
2. Extract durationId from: [${durationOptions}].
3. Extract severityId from: [${severityOptions}].
4. List co-occurring symptoms under extraSymptoms.
5. Write an empathetic 1-2 sentence conversationalReply for text-to-speech. Reference what they said. Be warm.
6. Set nextStep to one of: "tree_node", "duration", "severity", "result", or null (unknown).
7. DO NOT prescribe medications or diagnose.

${symptomSummary}

${activeQuestionContext}

CURRENT PATIENT STATE:
- Step: ${currentStep}
- Body area: ${ctxBodyArea || 'not yet selected'}
- Symptom: ${ctxSymptomName || ctxSymptomId || 'not yet selected'}
- Duration: ${ctxDuration || 'not yet provided'}
- Severity: ${ctxSeverity || 'not yet provided'}

RESPOND WITH ONLY VALID JSON:
{
  "intent": "SYMPTOM_REPORT",
  "extracted": {
    "bodyArea": "head_and_neck",
    "symptomId": "headache",
    "symptomName": "Headache / Migraine",
    "duration": "since yesterday",
    "durationId": "days",
    "severity": "really bad",
    "severityId": "severe",
    "extraSymptoms": ["dizziness"]
  },
  "decisionAnswer": null,
  "conversationalReply": "I understand you have had a severe headache since yesterday with dizziness. Let me ask a couple of quick questions.",
  "nextStep": "tree_node",
  "needsClarification": false
}`;

    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 450,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        // --- Change 4: inject recent conversation for multi-turn memory ---
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    });

    const rawContent = completion.choices[0]?.message?.content?.trim() || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch (parseErr) {
      console.warn('[AI Triage Controller] JSON parse failed, using heuristic fallback:', parseErr.message);
      const fallbackResult = heuristicExtract(message, currentStep, currentContext);
      return res.json({ success: true, ...fallbackResult });
    }

    return res.json({
      success: true,
      source: 'llm',
      ...parsed
    });

  } catch (error) {
    console.error('[AI Triage Controller] Error in understandSymptoms:', error.message);
    const fallbackResult = heuristicExtract(req.body?.message, req.body?.currentStep, req.body?.currentContext);
    return res.json({
      success: true,
      source: 'heuristic_fallback_on_error',
      ...fallbackResult
    });
  }
};
