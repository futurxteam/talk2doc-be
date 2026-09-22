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
    console.log('🌱 Syncing initial Malayalam & English SymptomSynonyms into MongoDB...');

    const SEED_DATA = [
      // Severities
      {
        type: 'severity',
        canonicalId: 'mild',
        canonicalName: 'Mild / Bearable',
        keywords: ['mild', 'slight', 'minor', 'little bit', 'tolerable', 'noticeable', 'manageable', 'light', 'not too bad', 'bearable', 'a bit', 'cheriya vedana', 'kurachu vedana', 'valiya preshnamilla', 'small pain', 'low grade', 'dull ache', 'faint pain', 'ചെറിയ വേദന', 'കുറച്ചു വേദന'],
        phoneticVariations: ['smile', 'smiled', 'mile', 'miles', 'mildly', 'while', 'wild', 'file']
      },
      {
        type: 'severity',
        canonicalId: 'moderate',
        canonicalName: 'Moderate / Disruptive',
        keywords: ['moderate', 'moderately', 'disrupts', 'disrupting', 'medium', 'uncomfortable', 'hard to work', 'trouble sleeping', 'bothering me', 'quite bad', 'fairly bad', 'affecting my routine', 'cant work properly', 'medium pain', 'sahikkan pattunnu', 'nalla vedana', 'കുറച്ചധികം വേദന'],
        phoneticVariations: ['moderately', 'modest', 'moderat']
      },
      {
        type: 'severity',
        canonicalId: 'severe',
        canonicalName: 'Severe / Intense',
        keywords: ['severe', 'severely', 'serious', "it's serious", 'its serious', 'terrible', 'unbearable', 'intense', 'extreme', 'killing me', 'excruciating', 'very bad', 'debilitating', 'worst pain', 'horrible', "can't move", 'really bad', 'pounding', 'throbbing bad', 'bayankara vedana', 'bhayankara vedana', 'sahikkan pattatha vedana', 'kooduthal vedana', 'severe pain', 'emergency level', "can't bear it", 'intolerable', 'ഭയങ്കര വേദന', 'കഠിനമായ വേദന'],
        phoneticVariations: ['50 severe', 'so severe', 'server', 'several']
      },

      // Durations
      {
        type: 'duration',
        canonicalId: 'hours',
        canonicalName: 'Hours to a day (< 24 hours)',
        keywords: ['hours', 'since last night', 'since morning', 'just started', 'less than 24', 'few hours', 'today', 'morning', 'hour', 'recently', 'sudden', 'today morning', 'few hours ago', 'from today', 'innu', 'innumuthal', 'ravile', 'ravile muthal', 'ippol thudangi', 'kurachu neramayi', 'ഇന്ന്'],
        phoneticVariations: ['our', 'ours', 'house']
      },
      {
        type: 'duration',
        canonicalId: 'days',
        canonicalName: '1 to 3 days',
        keywords: ['days', 'since yesterday', 'three days', '3 days', 'two days', '2 days', 'four days', '4 days', 'couple of days', 'couple days', 'few days', 'yesterday', 'day', 'last day', 'past day', 'past two days', 'past 2 days', 'for past two days', 'last 2 days', 'last two days', 'innale', 'innale muthal', 'randu divasam', 'moonnu divasam', 'kurachu divasayi', 'രണ്ട് ദിവസം', 'ഇന്നലെ'],
        phoneticVariations: ['daze', 'dais', 'date']
      },
      {
        type: 'duration',
        canonicalId: 'weeks',
        canonicalName: '1 to 4 weeks',
        keywords: ['weeks', '1 to 3 weeks', 'two weeks', '2 weeks', 'three weeks', '3 weeks', 'few weeks', '1 week', 'one week', 'week', 'fortnight', 'orazhcha', 'randazhcha', 'azhcha', 'ആഴ്ച'],
        phoneticVariations: ['weak', 'weaks']
      },
      {
        type: 'duration',
        canonicalId: 'chronic',
        canonicalName: 'More than a month',
        keywords: ['chronic', 'months', 'long time', 'month', 'years', 'since long', 'recurring', 'persistent', 'always', 'for months', 'for years', 'several months', 'ongoing for months', 'masangalayi', 'kure nalayi', 'kollangalayi', 'മാസങ്ങളായി'],
        phoneticVariations: ['tonic', 'tronic']
      },

      // Body Areas
      {
        type: 'body_area',
        canonicalId: 'head_and_neck',
        canonicalName: 'Head & Neck',
        keywords: ['head', 'forehead', 'temple', 'neck', 'throat', 'eye', 'ear', 'face', 'cranial', 'scalp', 'jaw', 'head and neck', 'thala', 'kazhuthu', 'thonda', 'thalavedana', 'തല', 'കഴുത്ത്']
      },
      {
        type: 'body_area',
        canonicalId: 'chest',
        canonicalName: 'Chest',
        keywords: ['chest', 'heart', 'lungs', 'ribs', 'breast', 'ribcage', 'sternum', 'breathing', 'breath', 'nenju', 'nenjil', 'shwasam', 'നെഞ്ച്']
      },
      {
        type: 'body_area',
        canonicalId: 'abdomen',
        canonicalName: 'Abdomen & Stomach',
        keywords: ['stomach', 'tummy', 'belly', 'abdomen', 'digestive', 'gut', 'epigastric', 'navel', 'vayaru', 'vayar', 'vayattil', 'വയറ്']
      },
      {
        type: 'body_area',
        canonicalId: 'lower_abdomen',
        canonicalName: 'Lower Abdomen & Pelvis',
        keywords: ['lower abdomen', 'lower belly', 'pelvis', 'groin', 'bladder', 'urinary', 'urine', 'pee', 'period', 'menstrual', 'testicular', 'cramps', 'adi vayaru', 'adivayaru', 'moothram', 'അടിവയർ']
      },
      {
        type: 'body_area',
        canonicalId: 'back',
        canonicalName: 'Back & Spine',
        keywords: ['back', 'spine', 'lower back', 'upper back', 'vertebrae', 'spinal', 'lumbago', 'nadukku', 'naduvvedana', 'puram', 'നടുവേദന']
      },
      {
        type: 'body_area',
        canonicalId: 'left_arm',
        canonicalName: 'Left Arm & Shoulder',
        keywords: ['left arm', 'left shoulder', 'left hand', 'left wrist', 'left elbow', 'kayyu', 'kai', 'tholi', 'കൈ']
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
        keywords: ['left leg', 'left knee', 'left foot', 'left ankle', 'thigh', 'calf', 'kaalu', 'kaal', 'mutti', 'പാദം', 'കാൽ']
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
        keywords: ['skin', 'rash', 'dermal', 'cutaneous', 'spots', 'itching', 'itchy', 'hives', 'acne', 'pimple', 'chori', 'chorichil', 'thadippu', 'ചൊറിച്ചിൽ', 'ചർമ്മം']
      },
      {
        type: 'body_area',
        canonicalId: 'general',
        canonicalName: 'General / Whole Body',
        keywords: ['general', 'whole body', 'body ache', 'fever', 'tired', 'weakness', 'fatigue', 'full body', 'pani', 'sheenam', 'ksheenam', 'udal vedana', 'പനി']
      },

      // Key & Added Symptoms
      {
        type: 'symptom',
        canonicalId: 'headache',
        canonicalName: 'Headache / Migraine',
        bodyArea: 'head_and_neck',
        keywords: ['headache', 'head ache', 'migraine', 'head hurts', 'pounding head', 'throbbing head', 'tension headache', 'thala vedana', 'thalavedana', 'thala karakkam', 'തലവേദന'],
        phoneticVariations: ['head ach', 'headake']
      },
      {
        type: 'symptom',
        canonicalId: 'common_cold',
        canonicalName: 'Common Cold / Flu',
        bodyArea: 'head_and_neck',
        keywords: ['common cold', 'cold', 'sneezing', 'runny nose', 'stuffy nose', 'jaladosham', 'pani', 'mookkozhukkal', 'jalam', 'തണുപ്പ്', 'ജലദോഷം', 'മൂക്കൊഴുക്കൽ'],
        phoneticVariations: ['cold', 'clod']
      },
      {
        type: 'symptom',
        canonicalId: 'toothache',
        canonicalName: 'Toothache / Dental Pain',
        bodyArea: 'head_and_neck',
        keywords: ['toothache', 'tooth ache', 'tooth pain', 'teeth pain', 'pallu vedana', 'dandam vedana', 'pallu vedanikkunnu', 'pallvedana', 'പല്ലുവേദന', 'ദന്തക്ഷയം'],
        phoneticVariations: ['tooth ach', 'tooth pain']
      },
      {
        type: 'symptom',
        canonicalId: 'mouth_ulcer',
        canonicalName: 'Mouth Ulcer / Canker Sore',
        bodyArea: 'head_and_neck',
        keywords: ['mouth ulcer', 'canker sore', 'oral ulcer', 'vaayil kuttam', 'vaayile vranam', 'vayile kuttam', 'vaaypunnu', 'വായയിലെ വ്രണം', 'വായ്പുണ്ണ്'],
        phoneticVariations: ['mouth sore']
      },
      {
        type: 'symptom',
        canonicalId: 'gum_pain_swelling',
        canonicalName: 'Gum Pain & Swelling',
        bodyArea: 'head_and_neck',
        keywords: ['gum pain', 'swollen gums', 'bleeding gums', 'eyaru vedana', 'pallinte iru', 'mona veekkam', 'മോണവീക്കം', 'മോണയിൽ ചോര'],
        phoneticVariations: ['gum ache']
      },
      {
        type: 'symptom',
        canonicalId: 'difficulty_swallowing',
        canonicalName: 'Difficulty Swallowing (Dysphagia)',
        bodyArea: 'head_and_neck',
        keywords: ['difficulty swallowing', 'painful swallowing', 'dysphagia', 'swallowing problem', 'irakkan budhimuttu', 'thondanirakkal budhimuttu', 'kazhikkan budhimuttu', 'ഇറക്കാൻ പ്രയാസം'],
        phoneticVariations: ['swallow pain']
      },
      {
        type: 'symptom',
        canonicalId: 'loss_of_smell',
        canonicalName: 'Loss of Smell (Anosmia)',
        bodyArea: 'head_and_neck',
        keywords: ['loss of smell', 'cannot smell', 'cant smell', 'anosmia', 'manam ariyunnilla', 'gandham ariyathe aayi', 'manam illa', 'മണം കിട്ടുന്നില്ല', 'ഗന്ധം നഷ്ടപ്പെട്ടു'],
        phoneticVariations: ['no smell']
      },
      {
        type: 'symptom',
        canonicalId: 'loss_of_taste',
        canonicalName: 'Loss of Taste (Ageusia)',
        bodyArea: 'head_and_neck',
        keywords: ['loss of taste', 'cannot taste', 'cant taste', 'ageusia', 'ruchi ariyunnilla', 'ruchiyilla', 'ruchi poyi', 'രുചി കിട്ടുന്നില്ല'],
        phoneticVariations: ['no taste']
      },
      {
        type: 'symptom',
        canonicalId: 'fever',
        canonicalName: 'Fever / High Temperature',
        bodyArea: 'general',
        keywords: ['fever', 'high temp', 'high temperature', 'feeling hot', 'feverish', 'chills', 'shivering', 'pani', 'panipole', 'choodu', 'പനി'],
        phoneticVariations: ['favor', 'fevar', 'febrile']
      },
      {
        type: 'symptom',
        canonicalId: 'cough',
        canonicalName: 'Cough',
        bodyArea: 'chest',
        keywords: ['cough', 'coughing', 'dry cough', 'wet cough', 'phlegm', 'hacking cough', 'chuma', 'chumaykkunnu', 'irumpal', 'ചുമ'],
        phoneticVariations: ['coff', 'caugh']
      },
      {
        type: 'symptom',
        canonicalId: 'chest_pain',
        canonicalName: 'Chest Pain / Heavy Pressure',
        bodyArea: 'chest',
        keywords: ['chest pain', 'chest ache', 'tightness in chest', 'chest hurts', 'heavy chest', 'pressure in chest', 'heart pain', 'nenjil vedana', 'nenju vedana', 'നെഞ്ചുവേദന'],
        phoneticVariations: ['chast pain']
      },
      {
        type: 'symptom',
        canonicalId: 'shortness_of_breath',
        canonicalName: 'Shortness of Breath / Breathing Difficulty',
        bodyArea: 'chest',
        keywords: ['shortness of breath', 'difficulty breathing', 'breathless', 'cant breathe', 'gasping', 'wheezing', 'shwasam muttal', 'shwasam thadasam', 'ശ്വാസംമുട്ടൽ'],
        phoneticVariations: ['breathless']
      },
      {
        type: 'symptom',
        canonicalId: 'abdominal_pain',
        canonicalName: 'Stomach / Abdominal Pain',
        bodyArea: 'abdomen',
        keywords: ['stomach pain', 'stomach ache', 'tummy ache', 'abdominal pain', 'belly ache', 'gut pain', 'cramps in stomach', 'vayaru vedana', 'vayar vedana', 'വയറുവേദന'],
        phoneticVariations: ['stomack pain']
      },
      {
        type: 'symptom',
        canonicalId: 'abdominal_cramps',
        canonicalName: 'Abdominal Cramps / Colic',
        bodyArea: 'abdomen',
        keywords: ['abdominal cramps', 'stomach cramps', 'cramping', 'belly cramps', 'vayattil pidutham', 'vayattil koluthal', 'vayaru pititham', 'koluthu vedana', 'വയറ്റിൽ കൊളുത്തിപ്പിടുത്തം'],
        phoneticVariations: ['belly cramps']
      },
      {
        type: 'symptom',
        canonicalId: 'blood_in_vomit',
        canonicalName: 'Vomiting Blood (Hematemesis)',
        bodyArea: 'abdomen',
        keywords: ['blood in vomit', 'vomiting blood', 'hematemesis', 'throwing up blood', 'chardiil chora', 'chora chardichu', 'chardiyil chora', 'രക്തം ഛർദ്ദിക്കൽ', 'ചർദ്ദിയിൽ രക്തം'],
        phoneticVariations: ['bloody vomit']
      },
      {
        type: 'symptom',
        canonicalId: 'diarrhea',
        canonicalName: 'Loose Motion / Diarrhea',
        bodyArea: 'abdomen',
        keywords: ['diarrhea', 'diarrhoea', 'loose motion', 'loose motions', 'watery stools', 'stomach upset', 'upset stomach', 'vayarilakkam', 'loose stool', 'loose stools', 'വയറിളക്കം'],
        phoneticVariations: ['direa', 'diarrea', 'motion']
      },
      {
        type: 'symptom',
        canonicalId: 'vomiting',
        canonicalName: 'Nausea & Vomiting',
        bodyArea: 'abdomen',
        keywords: ['vomiting', 'throwing up', 'nausea', 'feeling sick', 'queasy', 'puking', 'vomit', 'chardi', 'chardikkan thonnunnu', 'ഛർദ്ദി'],
        phoneticVariations: ['vomit', 'vomitting']
      },
      {
        type: 'symptom',
        canonicalId: 'urinary_incontinence',
        canonicalName: 'Urinary Incontinence',
        bodyArea: 'lower_abdomen',
        keywords: ['urinary incontinence', 'leaking urine', 'cannot control urine', 'urine leakage', 'moothram thadayan pattunnilla', 'moothram poyippovunnu', 'ariyathe moothram pokuka', 'മൂത്രം അറിയാതെ പോകുന്നു'],
        phoneticVariations: ['urine leak']
      },
      {
        type: 'symptom',
        canonicalId: 'lower_back_pain',
        canonicalName: 'Lower Back Pain',
        bodyArea: 'back',
        keywords: ['back pain', 'lower back pain', 'backache', 'spine pain', 'lumbago', 'stiff back', 'nadukku vedana', 'naduvvedana', 'back hurts', 'lower back', 'നടുവേദന'],
        phoneticVariations: ['backpane', 'back ache']
      },
      {
        type: 'symptom',
        canonicalId: 'sore_throat',
        canonicalName: 'Sore Throat',
        bodyArea: 'head_and_neck',
        keywords: ['sore throat', 'throat pain', 'throat hurts', 'scratchy throat', 'pain swallowing', 'thonda vedana', 'thondavedana', 'തണ്ടവേദന'],
        phoneticVariations: ['throat']
      },
      {
        type: 'symptom',
        canonicalId: 'dizziness',
        canonicalName: 'Dizziness / Vertigo',
        bodyArea: 'head_and_neck',
        keywords: ['dizziness', 'dizzy', 'vertigo', 'lightheaded', 'spinning head', 'unsteady', 'thala karakkam', 'thalakarakkam', 'തലകറക്കം'],
        phoneticVariations: ['dizy', 'dizzines']
      },
      {
        type: 'symptom',
        canonicalId: 'skin_rash',
        canonicalName: 'Skin Rash / Itching',
        bodyArea: 'skin',
        keywords: ['rash', 'skin rash', 'itching', 'itchy skin', 'red spots', 'hives', 'allergies on skin', 'chori', 'chorichil', 'thadippu', 'ചൊറിച്ചിൽ'],
        phoneticVariations: ['rach', 'rushes']
      },
      {
        type: 'symptom',
        canonicalId: 'itching',
        canonicalName: 'Generalized Itching (Pruritus)',
        bodyArea: 'skin',
        keywords: ['itching', 'severe itching', 'body itch', 'pruritus', 'chori', 'chorichil', 'udal muzhuvan chori', 'meyyil chori', 'ചൊറിച്ചിൽ'],
        phoneticVariations: ['itching']
      },
      {
        type: 'symptom',
        canonicalId: 'hair_loss',
        canonicalName: 'Hair Loss (Alopecia)',
        bodyArea: 'skin',
        keywords: ['hair loss', 'hair fall', 'losing hair', 'alopecia', 'mudi kozhiyunnu', 'mudi povunnu', 'mudi kottal', 'മുടി കൊഴിച്ചിൽ'],
        phoneticVariations: ['hair fall']
      },
      {
        type: 'symptom',
        canonicalId: 'joint_pain',
        canonicalName: 'General Joint Pain',
        bodyArea: 'general',
        keywords: ['joint pain', 'arthralgia', 'knee joint pain', 'mutteduthu vedana', 'sandhi vedana', 'mutti vedana', 'ellaru vedana', 'സന്ധിവേദന', 'മുട്ടുവേദന'],
        phoneticVariations: ['joint pain']
      },
      {
        type: 'symptom',
        canonicalId: 'muscle_cramps',
        canonicalName: 'Muscle Cramps / Spasms',
        bodyArea: 'general',
        keywords: ['muscle cramps', 'muscle spasm', 'cramp in leg', 'penda vedana', 'kaal koluthal', 'mamsapeshikal koluthal', 'naramb valivu', 'പേശിവലിവ്'],
        phoneticVariations: ['muscle cramp']
      },
      {
        type: 'symptom',
        canonicalId: 'swelling',
        canonicalName: 'Generalized Swelling (Edema)',
        bodyArea: 'general',
        keywords: ['swelling', 'edema', 'puffiness', 'swollen', 'veekkam', 'thadippu', 'shariram veenguka', 'mukham veekkam', 'വീക്കം'],
        phoneticVariations: ['swelling']
      },
      {
        type: 'symptom',
        canonicalId: 'weight_gain',
        canonicalName: 'Unexplained Weight Gain',
        bodyArea: 'general',
        keywords: ['weight gain', 'unexplained weight gain', 'gaining weight', 'thookkam kooduthal', 'bharam koodunnu', 'thadi koodunnu', 'ശരീരഭാരം കൂടുന്നു'],
        phoneticVariations: ['weight gain']
      },
      {
        type: 'symptom',
        canonicalId: 'excessive_sweating',
        canonicalName: 'Excessive Sweating (Hyperhidrosis)',
        bodyArea: 'general',
        keywords: ['excessive sweating', 'hyperhidrosis', 'sweating profusely', 'kooduthal viyarkkunnu', 'viyarppu', 'nalla viyarppu', 'അമിത വിയർപ്പ്'],
        phoneticVariations: ['sweating']
      },
      {
        type: 'symptom',
        canonicalId: 'excessive_sleepiness',
        canonicalName: 'Excessive Sleepiness (Somnolence)',
        bodyArea: 'general',
        keywords: ['excessive sleepiness', 'somnolence', 'drowsiness', 'urakkam thoongal', 'kooduthal urakkam', 'eppozhum urakkam', 'അമിതമായ ഉറക്കം'],
        phoneticVariations: ['sleepy']
      },
      {
        type: 'symptom',
        canonicalId: 'numbness_tingling',
        canonicalName: 'Numbness & Tingling (Paresthesia)',
        bodyArea: 'general',
        keywords: ['numbness', 'tingling', 'pins and needles', 'paresthesia', 'tharippu', 'maravippu', 'kai kaal tharippu', 'തരിപ്പ്', 'മരവിപ്പ്'],
        phoneticVariations: ['numbness']
      },
      {
        type: 'symptom',
        canonicalId: 'night_sweats',
        canonicalName: 'Night Sweats',
        bodyArea: 'general',
        keywords: ['night sweats', 'sweating at night', 'rathriyil viyarkkal', 'rathri viyarkkunnu', 'rathri viyarppu', 'രാത്രിയിലെ വിയർപ്പ്'],
        phoneticVariations: ['night sweat']
      },
      {
        type: 'symptom',
        canonicalId: 'arm_fracture_trauma',
        canonicalName: 'Suspected Arm Fracture / Bike Fall Injury',
        bodyArea: 'left_arm',
        keywords: ['broken arm', 'fractured arm', 'arm fracture', 'fell from bike', 'fell off bike', 'bike fall', 'bike accident', 'fall on arm', 'broken wrist', 'kayyu potti', 'kayyilootti', 'കൈ ഒടിഞ്ഞു'],
        phoneticVariations: ['broken arm']
      },
      {
        type: 'symptom',
        canonicalId: 'leg_fracture_trauma',
        canonicalName: 'Suspected Leg Fracture / Fall Injury',
        bodyArea: 'left_leg',
        keywords: ['broken leg', 'fractured leg', 'leg fracture', 'broken bone leg', 'cannot put weight', 'cant bear weight', 'bike fall leg', 'fall on leg', 'kaal odivu', 'kaalu potti', 'കാലൊടിഞ്ഞു'],
        phoneticVariations: ['broken leg']
      },
      {
        type: 'symptom',
        canonicalId: 'head_injury_trauma',
        canonicalName: 'Head Injury / Concussion',
        bodyArea: 'head_and_neck',
        keywords: ['head injury', 'concussion', 'fall on head', 'fell on head', 'bike accident head', 'hit head', 'thala adichu', 'thala potti', 'തലയ്ക്ക് പരിക്ക്'],
        phoneticVariations: ['head injury']
      }
    ];

    for (const item of SEED_DATA) {
      await SymptomSynonym.findOneAndUpdate(
        { type: item.type, canonicalId: item.canonicalId },
        item,
        { upsert: true, new: true }
      );
    }

    console.log(`✅ Upserted ${SEED_DATA.length} SymptomSynonyms (Malayalam & English) into MongoDB!`);
    await refreshSynonymsCache();
  } catch (err) {
    console.error('[SynonymController] Failed to seed initial synonyms:', err.message);
  }
};
