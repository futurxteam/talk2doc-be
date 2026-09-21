import SymptomSynonym from '../models/SymptomSynonym.js';

// In-memory cache for instant matching
let cachedSynonyms = null;
let lastCacheUpdate = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export const refreshSynonymsCache = async () => {
  try {
    const list = await SymptomSynonym.find({}).lean();
    const grouped = {
      symptoms: {},
      durations: {},
      severities: {},
      bodyAreas: {}
    };

    for (const item of list) {
      const allTerms = Array.from(
        new Set([
          ...(item.keywords || []),
          ...(item.phoneticVariations || []),
          item.canonicalId.toLowerCase(),
          item.canonicalName.toLowerCase()
        ])
      ).filter(Boolean);

      if (item.type === 'symptom') {
        grouped.symptoms[item.canonicalId] = {
          canonicalId: item.canonicalId,
          canonicalName: item.canonicalName,
          bodyArea: item.bodyArea,
          keywords: allTerms,
          hitCount: item.hitCount || 0
        };
      } else if (item.type === 'duration') {
        grouped.durations[item.canonicalId] = {
          canonicalId: item.canonicalId,
          canonicalName: item.canonicalName,
          keywords: allTerms
        };
      } else if (item.type === 'severity') {
        grouped.severities[item.canonicalId] = {
          canonicalId: item.canonicalId,
          canonicalName: item.canonicalName,
          keywords: allTerms
        };
      } else if (item.type === 'body_area') {
        grouped.bodyAreas[item.canonicalId] = {
          canonicalId: item.canonicalId,
          canonicalName: item.canonicalName,
          keywords: allTerms
        };
      }
    }

    cachedSynonyms = grouped;
    lastCacheUpdate = Date.now();
    return grouped;
  } catch (err) {
    console.error('[SynonymController] Failed to refresh cache:', err.message);
    return cachedSynonyms || { symptoms: {}, durations: {}, severities: {}, bodyAreas: {} };
  }
};

export const getAllSynonyms = async (req, res) => {
  try {
    if (!cachedSynonyms || Date.now() - lastCacheUpdate > CACHE_TTL_MS) {
      await refreshSynonymsCache();
    }
    return res.json({
      success: true,
      synonyms: cachedSynonyms
    });
  } catch (err) {
    console.error('[SynonymController] getAllSynonyms error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve synonyms' });
  }
};

export const learnSynonym = async (req, res) => {
  try {
    const { type, canonicalId, newKeyword, canonicalName, bodyArea, isPhonetic = false } = req.body;
    if (!type || !canonicalId || !newKeyword) {
      return res.status(400).json({ success: false, message: 'Missing type, canonicalId, or newKeyword' });
    }

    const cleanWord = newKeyword.toLowerCase().trim();
    if (!cleanWord || cleanWord.length < 2) {
      return res.status(400).json({ success: false, message: 'Keyword too short' });
    }

    const updateField = isPhonetic ? 'phoneticVariations' : 'keywords';

    const doc = await SymptomSynonym.findOneAndUpdate(
      { type, canonicalId },
      {
        $setOnInsert: {
          canonicalName: canonicalName || canonicalId,
          bodyArea: bodyArea || null,
          source: 'ai_learned'
        },
        $addToSet: { [updateField]: cleanWord },
        $inc: { hitCount: 1 }
      },
      { upsert: true, new: true }
    );

    // Refresh memory cache in background
    refreshSynonymsCache().catch(console.error);

    console.log(`[Synonym Learn] Learned new synonym for [${type}:${canonicalId}]: "${cleanWord}"`);
    return res.json({ success: true, learned: cleanWord, doc });
  } catch (err) {
    console.error('[SynonymController] learnSynonym error:', err);
    return res.status(500).json({ success: false, message: 'Failed to learn synonym' });
  }
};

export const seedSynonymsIfEmpty = async () => {
  try {
    const count = await SymptomSynonym.countDocuments({});
    if (count > 0) {
      console.log(`ℹ️ SymptomSynonym collection already seeded (${count} records). Refreshing cache...`);
      await refreshSynonymsCache();
      return;
    }

    console.log('🌱 Seeding initial SymptomSynonyms into MongoDB...');

    const SEED_DATA = [
      // Severities
      {
        type: 'severity',
        canonicalId: 'mild',
        canonicalName: 'Mild / Bearable',
        keywords: ['mild', 'slight', 'minor', 'little bit', 'tolerable', 'noticeable', 'manageable', 'light', 'not too bad', 'bearable', 'a bit', 'thoda', 'thodi si', 'small pain', 'low grade', 'dull ache', 'faint pain'],
        phoneticVariations: ['smile', 'smiled', 'mile', 'miles', 'mildly', 'while', 'wild', 'file']
      },
      {
        type: 'severity',
        canonicalId: 'moderate',
        canonicalName: 'Moderate / Disruptive',
        keywords: ['moderate', 'moderately', 'disrupts', 'disrupting', 'medium', 'uncomfortable', 'hard to work', 'trouble sleeping', 'bothering me', 'quite bad', 'fairly bad', 'affecting my routine', 'cant work properly', 'medium pain', 'theek theek', 'kafi dard'],
        phoneticVariations: ['moderately', 'modest', 'moderat']
      },
      {
        type: 'severity',
        canonicalId: 'severe',
        canonicalName: 'Severe / Intense',
        keywords: ['severe', 'severely', 'serious', "it's serious", 'its serious', 'terrible', 'unbearable', 'intense', 'extreme', 'killing me', 'excruciating', 'very bad', 'debilitating', 'worst pain', 'horrible', "can't move", 'really bad', 'pounding', 'throbbing bad', 'bahut zyada dard', 'bahut bura', 'severe pain', 'emergency level', "can't bear it", 'intolerable'],
        phoneticVariations: ['50 severe', 'so severe', 'server', 'several']
      },

      // Durations
      {
        type: 'duration',
        canonicalId: 'hours',
        canonicalName: 'Hours to a day (< 24 hours)',
        keywords: ['hours', 'since last night', 'since morning', 'just started', 'less than 24', 'few hours', 'today', 'morning', 'hour', 'recently', 'sudden', 'today morning', 'few hours ago', 'from today'],
        phoneticVariations: ['our', 'ours', 'house']
      },
      {
        type: 'duration',
        canonicalId: 'days',
        canonicalName: '1 to 3 days',
        keywords: ['days', 'since yesterday', 'three days', '3 days', 'two days', '2 days', 'four days', '4 days', 'couple of days', 'couple days', 'few days', 'yesterday', 'day', 'last day', 'past day', 'past two days', 'past 2 days', 'for past two days', 'last 2 days', 'last two days', 'for holiday', 'off last day', 'kal se', 'parso se', 'do din'],
        phoneticVariations: ['daze', 'dais', 'date']
      },
      {
        type: 'duration',
        canonicalId: 'weeks',
        canonicalName: '1 to 4 weeks',
        keywords: ['weeks', '1 to 3 weeks', 'two weeks', '2 weeks', 'three weeks', '3 weeks', 'few weeks', '1 week', 'one week', 'week', 'fortnight', 'ek hafta', 'do hafte'],
        phoneticVariations: ['weak', 'weaks']
      },
      {
        type: 'duration',
        canonicalId: 'chronic',
        canonicalName: 'More than a month',
        keywords: ['chronic', 'months', 'long time', 'month', 'years', 'since long', 'recurring', 'persistent', 'always', 'for months', 'for years', 'several months', 'ongoing for months', 'maheene se', 'hamesha'],
        phoneticVariations: ['tonic', 'tronic']
      },

      // Body Areas
      {
        type: 'body_area',
        canonicalId: 'head_and_neck',
        canonicalName: 'Head & Neck',
        keywords: ['head', 'forehead', 'temple', 'neck', 'throat', 'eye', 'ear', 'face', 'cranial', 'scalp', 'jaw', 'head and neck', 'sar', 'gala']
      },
      {
        type: 'body_area',
        canonicalId: 'chest',
        canonicalName: 'Chest',
        keywords: ['chest', 'heart', 'lungs', 'ribs', 'breast', 'ribcage', 'sternum', 'breathing', 'breath', 'chaati', 'seena']
      },
      {
        type: 'body_area',
        canonicalId: 'abdomen',
        canonicalName: 'Abdomen & Stomach',
        keywords: ['stomach', 'tummy', 'belly', 'abdomen', 'digestive', 'gut', 'epigastric', 'navel', 'pet', 'pet dard']
      },
      {
        type: 'body_area',
        canonicalId: 'lower_abdomen',
        canonicalName: 'Lower Abdomen & Pelvis',
        keywords: ['lower abdomen', 'lower belly', 'pelvis', 'groin', 'bladder', 'urinary', 'urine', 'pee', 'period', 'menstrual', 'testicular', 'cramps']
      },
      {
        type: 'body_area',
        canonicalId: 'back',
        canonicalName: 'Back & Spine',
        keywords: ['back', 'spine', 'lower back', 'upper back', 'vertebrae', 'spinal', 'lumbago', 'kamar', 'kamar dard']
      },
      {
        type: 'body_area',
        canonicalId: 'left_arm',
        canonicalName: 'Left Arm & Shoulder',
        keywords: ['left arm', 'left shoulder', 'left hand', 'left wrist', 'left elbow']
      },
      {
        type: 'body_area',
        canonicalId: 'right_arm',
        canonicalName: 'Right Arm & Shoulder',
        keywords: ['right arm', 'right shoulder', 'right hand', 'right wrist', 'right elbow']
      },
      {
        type: 'body_area',
        canonicalId: 'left_leg',
        canonicalName: 'Left Leg & Foot',
        keywords: ['left leg', 'left knee', 'left foot', 'left ankle', 'thigh', 'calf']
      },
      {
        type: 'body_area',
        canonicalId: 'right_leg',
        canonicalName: 'Right Leg & Foot',
        keywords: ['right leg', 'right knee', 'right foot', 'right ankle']
      },
      {
        type: 'body_area',
        canonicalId: 'skin',
        canonicalName: 'Skin & General Surface',
        keywords: ['skin', 'rash', 'dermal', 'cutaneous', 'spots', 'itching', 'itchy', 'hives', 'acne', 'pimple', 'khujli']
      },
      {
        type: 'body_area',
        canonicalId: 'general',
        canonicalName: 'General / Whole Body',
        keywords: ['general', 'whole body', 'body ache', 'fever', 'tired', 'weakness', 'fatigue', 'full body', 'sab jagah']
      },

      // Key Symptoms
      {
        type: 'symptom',
        canonicalId: 'headache',
        canonicalName: 'Headache / Migraine',
        bodyArea: 'head_and_neck',
        keywords: ['headache', 'head ache', 'migraine', 'head hurts', 'pounding head', 'throbbing head', 'tension headache', 'sar dard', 'sar ghoom raha'],
        phoneticVariations: ['head ach', 'headake']
      },
      {
        type: 'symptom',
        canonicalId: 'fever',
        canonicalName: 'Fever / High Temperature',
        bodyArea: 'general',
        keywords: ['fever', 'high temp', 'high temperature', 'feeling hot', 'feverish', 'chills', 'shivering', 'bukhar', 'tapman'],
        phoneticVariations: ['favor', 'fevar', 'febrile']
      },
      {
        type: 'symptom',
        canonicalId: 'cough',
        canonicalName: 'Cough',
        bodyArea: 'chest',
        keywords: ['cough', 'coughing', 'dry cough', 'wet cough', 'phlegm', 'hacking cough', 'khansi'],
        phoneticVariations: ['coff', 'caugh']
      },
      {
        type: 'symptom',
        canonicalId: 'chest_pain',
        canonicalName: 'Chest Pain / Heavy Pressure',
        bodyArea: 'chest',
        keywords: ['chest pain', 'chest ache', 'tightness in chest', 'chest hurts', 'heavy chest', 'pressure in chest', 'heart pain', 'chaati me dard'],
        phoneticVariations: ['chast pain']
      },
      {
        type: 'symptom',
        canonicalId: 'shortness_of_breath',
        canonicalName: 'Shortness of Breath / Breathing Difficulty',
        bodyArea: 'chest',
        keywords: ['shortness of breath', 'difficulty breathing', 'breathless', 'cant breathe', 'gasping', 'wheezing', 'saans lene me takleef'],
        phoneticVariations: ['breathless']
      },
      {
        type: 'symptom',
        canonicalId: 'abdominal_pain',
        canonicalName: 'Stomach / Abdominal Pain',
        bodyArea: 'abdomen',
        keywords: ['stomach pain', 'stomach ache', 'tummy ache', 'abdominal pain', 'belly ache', 'gut pain', 'cramps in stomach', 'pet dard'],
        phoneticVariations: ['stomack pain']
      },
      {
        type: 'symptom',
        canonicalId: 'diarrhea',
        canonicalName: 'Loose Motion / Diarrhea',
        bodyArea: 'abdomen',
        keywords: ['diarrhea', 'diarrhoea', 'loose motion', 'loose motions', 'watery stools', 'stomach upset', 'upset stomach', 'dast', 'loose stool', 'loose stools'],
        phoneticVariations: ['direa', 'diarrea', 'motion']
      },
      {
        type: 'symptom',
        canonicalId: 'vomiting',
        canonicalName: 'Nausea & Vomiting',
        bodyArea: 'abdomen',
        keywords: ['vomiting', 'throwing up', 'nausea', 'feeling sick', 'queasy', 'puking', 'vomit', 'ulti', 'ji machlana'],
        phoneticVariations: ['vomit', 'vomitting']
      },
      {
        type: 'symptom',
        canonicalId: 'lower_back_pain',
        canonicalName: 'Lower Back Pain',
        bodyArea: 'back',
        keywords: ['back pain', 'lower back pain', 'backache', 'spine pain', 'lumbago', 'stiff back', 'kamar dard', 'back hurts', 'lower back'],
        phoneticVariations: ['backpane', 'back ache']
      },
      {
        type: 'symptom',
        canonicalId: 'sore_throat',
        canonicalName: 'Sore Throat',
        bodyArea: 'head_and_neck',
        keywords: ['sore throat', 'throat pain', 'throat hurts', 'scratchy throat', 'pain swallowing', 'gala kharab', 'gale me dard'],
        phoneticVariations: ['throat']
      },
      {
        type: 'symptom',
        canonicalId: 'dizziness',
        canonicalName: 'Dizziness / Vertigo',
        bodyArea: 'head_and_neck',
        keywords: ['dizziness', 'dizzy', 'vertigo', 'lightheaded', 'spinning head', 'unsteady', 'chakkar', 'chakkar aana'],
        phoneticVariations: ['dizy', 'dizzines']
      },
      {
        type: 'symptom',
        canonicalId: 'skin_rash',
        canonicalName: 'Skin Rash / Itching',
        bodyArea: 'skin',
        keywords: ['rash', 'skin rash', 'itching', 'itchy skin', 'red spots', 'hives', 'allergies on skin', 'khujli'],
        phoneticVariations: ['rach', 'rushes']
      }
    ];

    await SymptomSynonym.insertMany(SEED_DATA);
    console.log(`✅ Seeded ${SEED_DATA.length} initial SymptomSynonyms into MongoDB!`);
    await refreshSynonymsCache();
  } catch (err) {
    console.error('[SynonymController] Failed to seed initial synonyms:', err.message);
  }
};
