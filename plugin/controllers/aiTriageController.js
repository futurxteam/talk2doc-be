import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SymptomSynonym from '../../models/SymptomSynonym.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Background auto-learn helper
const autoLearnFromExtraction = async (message, extracted) => {
  if (!extracted || !message) return;
  try {
    const rawMsg = message.toLowerCase().trim();
    if (rawMsg.length > 2 && rawMsg.length < 80) {
      if (extracted.symptomId) {
        await SymptomSynonym.findOneAndUpdate(
          { type: 'symptom', canonicalId: extracted.symptomId },
          {
            $setOnInsert: {
              canonicalName: extracted.symptomName || extracted.symptomId,
              bodyArea: extracted.bodyArea || null,
              source: 'ai_learned'
            },
            $addToSet: { keywords: rawMsg },
            $inc: { hitCount: 1 }
          },
          { upsert: true }
        );
      }
      if (extracted.durationId && rawMsg.length < 40) {
        await SymptomSynonym.findOneAndUpdate(
          { type: 'duration', canonicalId: extracted.durationId },
          {
            $addToSet: { keywords: rawMsg },
            $inc: { hitCount: 1 }
          },
          { upsert: true }
        );
      }
      if (extracted.severityId && rawMsg.length < 40) {
        await SymptomSynonym.findOneAndUpdate(
          { type: 'severity', canonicalId: extracted.severityId },
          {
            $addToSet: { keywords: rawMsg },
            $inc: { hitCount: 1 }
          },
          { upsert: true }
        );
      }
    }
  } catch {
    // Non-blocking auto-learn
  }
};

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

// Language and Manglish detection helper
export function detectMessageLanguage(text) {
  if (!text || typeof text !== 'string') return 'english';
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'malayalam_script';
  }
  const manglishSignals = [
    'enikku', 'eniku', 'enik', 'vedana', 'vedanikkunnu', 'pallu', 'thala', 'thalavedana',
    'vayaru', 'vayar', 'vayattil', 'kazhuthu', 'nenju', 'nenjil', 'chardi', 'chuma',
    'pani', 'sheenam', 'ksheenam', 'tharippu', 'veekkam', 'chori', 'chorichil',
    'moothram', 'innu', 'inn', 'innumuthal', 'innale', 'ravile', 'ippol', 'kurachu',
    'kure', 'neram', 'neramayi', 'divasam', 'divasamayi', 'bayankara', 'bhayankara',
    'cheriya', 'und', 'undu', 'undo', 'ind', 'indo', 'illa', 'illanne', 'onnumilla', 'onnumillaa',
    'vannu', 'poyi', 'aayi', 'aayo', 'aayilla', 'kayyu', 'kaalu',
    'potti', 'odivu', 'aano', 'aanu', 'alla', 'allayo', 'allaayo', 'kooduthal', 'kooduthalaano', 'sahikkan', 'muthal', 'koluthipidutham',
    'koluthal', 'chora', 'raktham', 'kazhikkan', 'urakkam', 'maravippu', 'ayyo', 'ayyoo', 'kashtam',
    'prashnam', 'prashnangal', 'sambandhichu', 'sambandhicha', 'thudangi', 'thudangiyittu',
    'vedanayo', 'cheruthaano', 'cheruthano', 'budhimuttu', 'budhimuttundalle', 'ethra', 'engane', 'ithu',
    'thavana', 'thavano', 'thavanaayi', 'pravashyam', 'pravisham', 'vatam'
  ];
  const lower = text.toLowerCase();
  if (/\b\d+\s*(thavana|pravashyam|vatam)\b/i.test(lower)) {
    return 'manglish';
  }
  const words = lower.split(/[^a-zA-Z]+/);
  if (words.some(w => manglishSignals.includes(w))) {
    return 'manglish';
  }
  return 'english';
}

// Comprehensive local synonym dictionary for zero-dependency / offline fallback
const LOCAL_BODY_AREAS = {
  head_and_neck: ['head', 'forehead', 'temple', 'neck', 'throat', 'eye', 'ear', 'face', 'cranial', 'scalp', 'jaw', 'thala', 'kazhuthu', 'thonda', 'thalavedana', 'തല', 'കഴുത്ത്'],
  chest: ['chest', 'heart', 'lungs', 'ribs', 'breast', 'ribcage', 'sternum', 'breathing', 'breath', 'nenju', 'nenjil', 'shwasam', 'നെഞ്ച്'],
  abdomen: ['stomach', 'tummy', 'belly', 'abdomen', 'digestive', 'gut', 'epigastric', 'navel', 'vayaru', 'vayar', 'vayattil', 'വയറ്'],
  lower_abdomen: ['lower abdomen', 'lower belly', 'pelvis', 'groin', 'bladder', 'urinary', 'urine', 'pee', 'period', 'menstrual', 'testicular', 'cramps', 'adi vayaru', 'adivayaru', 'moothram', 'അടിവയർ'],
  left_arm: ['left arm', 'left shoulder', 'left hand', 'left wrist', 'left elbow', 'arm', 'shoulder', 'hand', 'elbow', 'wrist', 'kayyu', 'kai', 'tholi', 'കൈ'],
  right_arm: ['right arm', 'right shoulder', 'right hand', 'right wrist', 'right elbow'],
  left_leg: ['left leg', 'left knee', 'left foot', 'left ankle', 'leg', 'knee', 'foot', 'ankle', 'thigh', 'calf', 'walking', 'kaalu', 'kaal', 'mutti', 'പാദം', 'കാൽ'],
  right_leg: ['right leg', 'right knee', 'right foot', 'right ankle'],
  skin: ['skin', 'rash', 'dermal', 'cutaneous', 'spots', 'itching', 'itchy', 'hives', 'acne', 'pimple', 'chori', 'chorichil', 'thadippu', 'കുരു', 'ചൊറിച്ചിൽ'],
  back: ['back', 'spine', 'lower back', 'upper back', 'vertebrae', 'spinal', 'lumbago', 'nadukku', 'naduvvedana', 'puram', 'നടുവേദന']
};

const LOCAL_DURATION_KEYWORDS = {
  hours: ['since last night', 'since morning', 'just started', 'less than 24', 'few hours', 'today', 'morning', 'hours', 'hour', 'recently', 'sudden', 'innu', 'innumuthal', 'ravile', 'ippol thudangi', 'kurachu neramayi', 'ഇന്ന്'],
  days: ['since yesterday', 'three days', '3 days', 'two days', '2 days', 'four days', '4 days', 'couple of days', 'couple days', 'few days', 'yesterday', 'days', 'day', 'innale', 'innale muthal', 'randu divasam', 'moonnu divasam', 'kurachu divasayi', 'രണ്ട് ദിവസം', 'ഇന്നലെ'],
  weeks: ['1 to 3 weeks', 'two weeks', '2 weeks', 'three weeks', '3 weeks', 'few weeks', '1 week', 'one week', 'weeks', 'week', 'fortnight', 'orazhcha', 'randazhcha', 'azhcha', 'ആഴ്ച'],
  chronic: ['more than a month', 'several months', 'long time', 'chronic', 'ongoing', 'months', 'month', 'years', 'year', 'always', 'masangalayi', 'kure nalayi', 'kollangalayi', 'മാസങ്ങളായി']
};

const LOCAL_SEVERITY_KEYWORDS = {
  mild: ['mild', 'slight', 'minor', 'little', 'tolerable', 'bearable', 'light', 'a bit', 'cheriya vedana', 'kurachu vedana', 'valiya preshnamilla', 'കുറച്ചു വേദന', 'ചെറിയ'],
  moderate: ['moderate', 'medium', 'uncomfortable', 'somewhat bad', 'bothersome', 'disrupts', 'sahikkan pattunnu', 'nalla vedana', 'കുറച്ചധികം'],
  severe: ['severe', 'really bad', 'very bad', 'terrible', 'unbearable', 'excruciating', 'extreme', 'killing me', 'horrible', 'intense', 'pounding', 'debilitating', 'bayankara vedana', 'bhayankara vedana', 'sahikkan pattatha vedana', 'kooduthal vedana', 'bhayanakamaaya', 'ഭയങ്കര വേദന']
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

  // Extra common symptom checks — DENTAL checks have highest priority (before headache)
  if (
    text.includes('pallu vedana') || text.includes('pall vedana') ||
    text.includes('pallu kuthal') || text.includes('dhantha vedana') ||
    text.includes('toothache') || text.includes('tooth pain') || text.includes('tooth ache') ||
    text.includes('teeth pain') || text.includes('molar pain') || text.includes('dental pain') ||
    text.includes('wisdom tooth') || text.includes('cavity pain') || text.includes('pallu') && (text.includes('vedana') || text.includes('kuthal') || text.includes('vali'))
  ) {
    matchedBodyArea = 'head_and_neck';
    matchedSymptomId = 'toothache';
    matchedSymptomName = 'Toothache / Dental Pain';
  } else if (text.includes('eenu vedana') || text.includes('eenu veekkam') || text.includes('gum') || text.includes('mona vedana')) {
    if (!matchedSymptomId) {
      matchedBodyArea = 'head_and_neck';
      matchedSymptomId = 'gum_pain_swelling';
      matchedSymptomName = 'Gum Pain / Swelling / Bleeding Gums';
    }
  } else if (text.includes('headache') || text.includes('head ache') || text.includes('migraine') || text.includes('head hurts') || text.includes('pounding head') || text.includes('thalavedana') || text.includes('thala vedana')) {
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

  // Fracture / Trauma / Bike fall checks
  if (
    text.includes('fracture') ||
    text.includes('broken') ||
    text.includes('fell') ||
    text.includes('bike') ||
    text.includes('fall') ||
    text.includes('accident') ||
    text.includes('crash')
  ) {
    if (
      text.includes('arm') ||
      text.includes('shoulder') ||
      text.includes('wrist') ||
      text.includes('elbow') ||
      text.includes('hand') ||
      matchedBodyArea === 'left_arm' ||
      matchedBodyArea === 'right_arm'
    ) {
      matchedBodyArea = text.includes('right') ? 'right_arm' : 'left_arm';
      matchedSymptomId = 'arm_fracture_trauma';
      matchedSymptomName = 'Suspected Fracture / Broken Arm / Fall Injury';
    } else if (
      text.includes('leg') ||
      text.includes('knee') ||
      text.includes('foot') ||
      text.includes('ankle') ||
      matchedBodyArea === 'left_leg' ||
      matchedBodyArea === 'right_leg'
    ) {
      matchedBodyArea = text.includes('right') ? 'right_leg' : 'left_leg';
      matchedSymptomId = 'leg_fracture_trauma';
      matchedSymptomName = 'Suspected Fracture / Broken Leg / Inability to Bear Weight';
    } else if (text.includes('head') || text.includes('face') || text.includes('skull')) {
      matchedBodyArea = 'head_and_neck';
      matchedSymptomId = 'head_injury_trauma';
      matchedSymptomName = 'Head Injury / Concussion / Fall on Head';
    }
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

  const inputLang = detectMessageLanguage(message);

  // Check if currentStep is duration or severity
  if (currentStep === 'duration' && durationId) {
    const durReply = inputLang === 'manglish'
      ? `Manasilayi, ithu ${durationText} aayi thudangiyitt ennu note cheythu.`
      : `Got it, you've had this for ${durationText}.`;
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
      conversationalReply: durReply,
      needsClarification: false
    };
  }

  if (currentStep === 'severity' && severityId) {
    const sevReply = inputLang === 'manglish'
      ? `Sari, ${severityId} vedana ennu note cheythu.`
      : `Understood, noted as ${severityId} discomfort.`;
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
      conversationalReply: sevReply,
      needsClarification: false
    };
  }

  // Generate genuinely warm, informal conversational reply
  let conversationalReply = '';
  const profile = matchedSymptomId ? departmentData.followUpProfiles?.[matchedSymptomId] : null;

  if (inputLang === 'manglish') {
    if (matchedSymptomName) {
      if (durationId && severityId) {
        conversationalReply = `Ayyoo, ${matchedSymptomName} karanam valare kashtamayi! Pedikkanda — namukku nalla specialist-e kandam.`;
      } else if (durationId) {
        if (profile && profile.requiresSeverity === false && profile.questions?.[0]) {
          const qObj = profile.questions[0];
          conversationalReply = `Seri, ${matchedSymptomName} ${durationText} aayi und ennu arinjhu. ${qObj.manglish || qObj.question}`;
        } else {
          conversationalReply = `Seri, ${matchedSymptomName} und ennu arinjhu. Vedana engane und — cheruthano, idatharam aano, atho sahikkan pattatha bayankara vedana aano?`;
        }
      } else if (severityId) {
        conversationalReply = `Ayyoo, ${matchedSymptomName} karanam kashtamayi! Ithu evide muthal thudangi — inno, kurachu divasam munpe, atho athil kooduthal naalaayo?`;
      } else {
        conversationalReply = `Ayyoo, ${matchedSymptomName} undo! Ithu evide muthal thudangi — inno thudangiyo, atho innale / kurachu divasam aayiyo?`;
      }
    } else if (matchedBodyArea) {
      conversationalReply = `Seri, ${matchedBodyArea.replace(/_/g, ' ')} bhagath budhimuttundalle. Avide enthanu prashnam ennu parayamo?`;
    } else {
      conversationalReply = `Ayyoo, pedikkenda! Sarirathil evideyannu budhimuttu ennu parayamo — thala, vayaru, nenju, atho vere evideyengilumano?`;
    }
  } else {
    if (matchedSymptomName) {
      const sevPhrase = severityId ? ` ${severityId}` : '';
      let durPhrase = '';
      if (durationText) {
        durPhrase = durationText.startsWith('since') ? ` ${durationText}` : ` for ${durationText}`;
      }
      const extraPhrase = extraSymptoms.length > 0 ? ` with ${extraSymptoms.join(', ')}` : '';

      if (durationId && severityId) {
        conversationalReply = `Oh bless you, I hear you — having${sevPhrase} ${matchedSymptomName.toLowerCase()}${durPhrase}${extraPhrase} sounds really tough! Don't worry at all, I've got everything I need to guide you to the right specialist.`;
      } else if (durationId) {
        if (profile && profile.requiresSeverity === false && profile.questions?.[0]) {
          const qObj = profile.questions[0];
          conversationalReply = `Got it, you've had ${matchedSymptomName.toLowerCase()}${durPhrase}. ${qObj.question}`;
        } else {
          conversationalReply = `Aww, so sorry you've had ${matchedSymptomName.toLowerCase()}${durPhrase}! Just one quick thing — how intense is it feeling right now? Mild, moderate, or severe?`;
        }
      } else if (severityId) {
        conversationalReply = `Oh gosh, ${sevPhrase.trim()} ${matchedSymptomName.toLowerCase()} sounds so miserable! Roughly when did this first start? Today, a few days ago, or longer?`;
      } else {
        conversationalReply = `Oh no, I'm so sorry you're dealing with ${matchedSymptomName.toLowerCase()}! Let's get you checked out — when did this first start?`;
      }
    } else if (matchedBodyArea) {
      conversationalReply = `Got it, discomfort around your ${matchedBodyArea.replace(/_/g, ' ')}. Don't worry, what sort of trouble are you having there?`;
    } else {
      conversationalReply = `Hey, I'm right here with you! Could you tell me roughly where you're feeling unwell — like your head, tummy, chest, or somewhere else?`;
    }
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

    // Build Clinical Follow-Up Profile context for active symptom if available
    let followUpProfileContext = '';
    const prelimExtraction = !ctxSymptomId ? heuristicExtract(message, currentStep, currentContext)?.extracted : null;
    const activeSymptomId = ctxSymptomId || prelimExtraction?.symptomId;
    const profile = activeSymptomId ? departmentData.followUpProfiles?.[activeSymptomId] : null;
    if (profile) {
      const qLines = (profile.questions || []).map(q => {
        const opts = (q.options || []).map(o => `${o.id}: "${o.label}"`).join(', ');
        return `* Question ID "${q.id}" (Priority ${q.priority}): "${q.question}" [Options: ${opts}]`;
      }).join('\n');
      followUpProfileContext = `
CLINICAL FOLLOW-UP PROFILE FOR "${activeSymptomId}":
- Requires Duration: ${profile.requiresDuration ? 'YES' : 'NO'}
- Requires Severity (mild/moderate/severe): ${profile.requiresSeverity ? 'YES' : 'NO (CRITICAL: DO NOT ask generic mild/moderate/severe question!)'}
- Specific Clinical Questions to Ask instead:
${qLines}
`;
    }

    // Build conversation history for LLM multi-turn context
    const conversationHistory = (recentConversation || []).map(turn => ({
      role: turn.role === 'user' ? 'user' : 'assistant',
      content: turn.text || ''
    }));

    // Detect language of the input message
    const detectedLang = detectMessageLanguage(message);

    const systemPrompt = `You are Talk2Doc, a warm, caring, sweet, and informal medical triage companion.
Your goal is to parse a patient's natural language statement into structured clinical data while sounding like an empathetic friend or caring nurse.
The patient may speak English, Malayalam script (മലയാളം), or MANGLISH (Malayalam written using English/Latin alphabet, e.g. "enikku bayankara pallu vedana und innu muthal", "vayattil koluthipidutham pole vedana", "chardi vannu").

CRITICAL INSTRUCTIONS:
1. Extract bodyArea and symptomId ONLY from the catalog below.
2. Extract durationId from: [${durationOptions}].
3. Extract severityId from: [${severityOptions}].
4. If a CLINICAL FOLLOW-UP PROFILE is provided, extract any answered profile question into profileAnswers object { questionId: optionId }.
5. List co-occurring symptoms under extraSymptoms.
6. LANGUAGE & SCRIPT RULES (EXTREMELY IMPORTANT):
   - IF the user writes in MANGLISH (Malayalam typed in English letters):
     You MUST formulate your conversationalReply in natural, empathetic, caring, sweet MANGLISH (Malayalam words written in English/Latin letters).
     DO NOT reply in Malayalam script. DO NOT reply in formal English.
     Example Manglish conversationalReply:
     * "Ayyoo, vayaru vedana undo! Ithu evide muthal thudangi — inno thudangiyo, atho kurachu divasam aayiyo?"
     * "Ayyoo, pallu vedana bayankara kashtam! Vedana engane und — cheruthano, idatharam aano, atho bayankara aano?"
     * "Pedikkanda, namukku nalla specialist-e kandam. Ellaam sheri aakum!"
   - IF the user writes in Malayalam script (മലയാളം, e.g. "എനിക്ക് തലവേദനയുണ്ട്"):
     You MUST reply in warm Malayalam script (മലയാളം).
   - IF the user writes in English:
     Write conversationalReply in warm, friendly, empathetic English.
   - STRICT PROHIBITION: NEVER use Hindi words (such as dard, bukhar, pet, kripya, theek, etc.) under ANY circumstances. Talk2Doc serves Malayalam and English speaking patients only.
7. STEP-BY-STEP QUESTIONING RULES:
   - If ONLY a body area or general health issue is identified (e.g. "periods", "stomach", "chest", "head", "leg") and a specific symptom is NOT yet known:
     Acknowledge the area with warm empathy and ask what specific trouble, symptom, or problem they are facing in that area, in the patient's language.
     DO NOT ask about duration or severity yet!
   - If a symptom is identified:
     * If duration is NOT provided: Acknowledge the symptom with empathy and ask about the timeframe/duration.
     * If duration IS provided (or already known):
       - If a CLINICAL FOLLOW-UP PROFILE is provided for this symptom:
         * If Requires Severity is NO: NEVER ask if the symptom is mild, moderate, or severe!
         * Ask the next unanswered clinical question from the profile (e.g. for diarrhea: ask how many times stools were passed today; for tinnitus: ask if in one ear or both; for urinary: ask if burning or fever is present; for jaundice: ask about dark urine/pale stool; for fever: ask temperature).
         * Set nextStep to "profile_question" (or "result" if all profile questions are answered).
       - If no profile is provided, ask severity (mild, moderate, or severe).
   - If the patient provided symptom + duration + specific answers all in one single sentence: Acknowledge everything and set nextStep to "result".
8. DO NOT prescribe medications or diagnose.


${symptomSummary}

${activeQuestionContext}

${followUpProfileContext}

CURRENT PATIENT STATE:
- Step: ${currentStep}
- Body area: ${ctxBodyArea || 'not yet selected'}
- Symptom: ${ctxSymptomName || ctxSymptomId || 'not yet selected'}
- Duration: ${ctxDuration || 'not yet provided'}
- Severity: ${ctxSeverity || 'not yet provided'}

RESPOND WITH ONLY VALID JSON (the fields must match the patient's ACTUAL symptom, not the example values below):
{
  "intent": "SYMPTOM_REPORT",
  "extracted": {
    "bodyArea": "general",
    "symptomId": "fever",
    "symptomName": "Fever / High Temperature",
    "duration": "since this morning",
    "durationId": "hours",
    "severity": null,
    "severityId": null,
    "profileAnswers": {},
    "extraSymptoms": []
  },
  "decisionAnswer": null,
  "conversationalReply": "Ayyoo, pani und ennu parayunnu! Ithu thudangiyittu ethra neramayi?",
  "nextStep": "duration",
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

      // --- Safety Sanitizer: Ensure speech question matches the UI step ---
      // ONLY enforce duration question if a specific symptom is ALREADY identified!
      // If only a body area is known, the conversational speech should ask what the problem is.
      const hasSymptom = Boolean(parsed.extracted?.symptomId || currentContext.symptomId);
      const hasDuration = Boolean(parsed.extracted?.durationId || currentContext.duration);
      const hasSeverity = Boolean(parsed.extracted?.severityId || currentContext.severity);

      const activeSympId = parsed.extracted?.symptomId || currentContext.symptomId;
      const sympProfile = activeSympId ? departmentData.followUpProfiles?.[activeSympId] : null;
      if (sympProfile && sympProfile.requiresSeverity === false && parsed.conversationalReply) {
        parsed.conversationalReply = parsed.conversationalReply
          .replace(/(,\s*)?(and\s+)?(how\s+severe\s+(is\s+it|is\s+the\s+discomfort)|is\s+it|would\s+you\s+(call|say|describe)\s+it|how\s+intense\s+is\s+it|is\s+that)[^.!?]*(mild|moderate|severe)[^.!?]*[.!?]?/gi, '.')
          .replace(/(,\s*)?(and\s+)?(is\s+it|would\s+you\s+(call|say|describe)\s+it|how\s+intense\s+is\s+it|is\s+that)\s+(mild|moderate|severe)[^.!?]*[.!?]?/gi, '.')
          .replace(/how severe[^.!?]*[.!?]/gi, '')
          .replace(/(ithu\s+)?(cheruthano|mild\s+aano)[^.!?]*[.!?]?/gi, '.')
          .replace(/(vedana|budhimuttu|kashtam)\s+engane\s+und[^.!?]*[.!?]?/gi, '.')
          .replace(/ithu\s+ethra\s+kashtam\s+und[^.!?]*[.!?]?/gi, '.')
          .replace(/വേദന\s+എങ്ങനെയുണ്ട്[^.!?]*[.!?]?/gi, '.')
          .replace(/[-—–:,]\s*\./g, '.')
          .replace(/\s+([.!?])/g, '$1')
          .replace(/\.\./g, '.')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (hasDuration && sympProfile.questions && sympProfile.questions.length > 0) {
          const firstQ = sympProfile.questions[0];
          const replyLower = parsed.conversationalReply.toLowerCase();
          const hasProfileQ = sympProfile.questions.some(q =>
            replyLower.includes(q.id.replace(/_/g, ' ')) ||
            replyLower.includes('times') ||
            replyLower.includes('thavana') ||
            replyLower.includes('pravashyam') ||
            replyLower.includes('ear') ||
            replyLower.includes('urin') ||
            replyLower.includes('temperature')
          );
          if (!hasProfileQ) {
            const replyLang = detectMessageLanguage(parsed.conversationalReply);
            const qText = (replyLang === 'manglish' && firstQ.manglish)
              ? firstQ.manglish
              : (replyLang === 'malayalam_script' && firstQ.malayalam)
                ? firstQ.malayalam
                : firstQ.question;
            parsed.conversationalReply = parsed.conversationalReply.replace(/[.!?]$/, '') + '. ' + qText;
          }
        }
      }

      if (hasSymptom && !hasDuration && parsed.conversationalReply) {
        // Strip out any premature mild/moderate/severe questions bundled by the LLM
        parsed.conversationalReply = parsed.conversationalReply
          .replace(/(,\s*)?(and\s+)?(is\s+it|would\s+you\s+(call|say|describe)\s+it|how\s+intense\s+is\s+it|is\s+that)\s+(mild|moderate|severe)[^.!?]*[.!?]?/gi, '.')
          .replace(/\s{2,}/g, ' ')
          .replace(/\.\./g, '.')
          .trim();

        // Ensure there is a duration question if it got stripped
        const hasDurationQ = /(how long|when did|since when|days|hours|timeframe|eppozh|ethra|eppol|neram|divasam|നാൾ|എപ്പോൾ)/i.test(parsed.conversationalReply);
        if (!hasDurationQ) {
          const replyLang = detectMessageLanguage(parsed.conversationalReply);
          const effectiveLang = (detectedLang === 'manglish' || replyLang === 'manglish')
            ? 'manglish'
            : (detectedLang === 'malayalam_script' || replyLang === 'malayalam_script')
              ? 'malayalam_script'
              : 'english';

          if (effectiveLang === 'manglish') {
            parsed.conversationalReply = parsed.conversationalReply.replace(/[.!?]$/, '') + '. Ithu thudangiyittu ethra neramayi / ethra naalayi?';
          } else if (effectiveLang === 'malayalam_script') {
            parsed.conversationalReply = parsed.conversationalReply.replace(/[.!?]$/, '') + '. ഇത് തുടങ്ങിയിട്ട് എത്ര സമയമായി?';
          } else {
            parsed.conversationalReply = parsed.conversationalReply.replace(/[.!?]$/, '') + '. Roughly how long has this been going on?';
          }
        }
      }

      if (parsed?.extracted) {
        autoLearnFromExtraction(message, parsed.extracted).catch(() => { });
      }
    } catch (parseErr) {
      console.warn('[AI Triage Controller] JSON parse failed, using heuristic fallback:', parseErr.message);
      const fallbackResult = heuristicExtract(message, currentStep, currentContext);
      if (fallbackResult?.extracted) {
        autoLearnFromExtraction(message, fallbackResult.extracted).catch(() => { });
      }
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
    if (fallbackResult?.extracted) {
      autoLearnFromExtraction(req.body?.message, fallbackResult.extracted).catch(() => { });
    }
    return res.json({
      success: true,
      source: 'heuristic_fallback_on_error',
      ...fallbackResult
    });
  }
};
