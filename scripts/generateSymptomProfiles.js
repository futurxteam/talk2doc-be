import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mapPath = path.resolve(__dirname, '../plugin/data/departmentMap.json');

const raw = fs.readFileSync(mapPath, 'utf8');
const data = JSON.parse(raw);

const profiles = {
  // ═══ 1. GENERAL / SYSTEMIC ═══
  fever: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "fever_features",
        priority: 1,
        type: "single_select",
        question: "How high is your temperature, and are you having shivering, rash, or severe headache?",
        manglish: "Panikooduthalano, virayalo, sharirathil thadippo, kadinamaya thalavedanayo undo?",
        malayalam: "പനി എത്രത്തോളമുണ്ട്? വിറയലോ, ശരീരത്തിൽ തടിപ്പുകളോ, കഠിനമായ തലവേദനയോ ഉണ്ടോ?",
        options: [
          {
            id: "fever_with_rash_stiff_neck",
            label: "High fever with neck stiffness, confusion, or rash",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Kadinamaya pani, kazhuthu vedana, thadippu",
            malayalam: "കഠിനമായ പനി, കഴുത്ത് അനക്കാൻ പറ്റാത്ത അവസ്ഥ, തടിപ്പ്"
          },
          {
            id: "fever_with_chills",
            label: "High fever with shaking chills and body ache",
            manglish: "Virayaloothode ulla pani, sharira vedana",
            malayalam: "വിറയലോടെയുള്ള കടുത്ത പനിയും ശരീരവേദനയും"
          },
          {
            id: "mild_low_grade_fever",
            label: "Mild low-grade fever with mild cold/cough",
            manglish: "Cheriya pani, jaladosham / chuma",
            malayalam: "നേരിയ പനിയും ജലദോഷവും"
          }
        ]
      }
    ]
  },
  fatigue: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "fatigue_features",
        priority: 1,
        type: "single_select",
        question: "How is your fatigue affecting you, and are there associated symptoms?",
        manglish: "Ksheenam enganeyanu thonnunnathu, vere enthengilum lakshanangal undo?",
        malayalam: "ക്ഷീണം എങ്ങനെയാണ് അനുഭവപ്പെടുന്നത്? മറ്റ് ലക്ഷണങ്ങൾ വല്ലതും ഉണ്ടോ?",
        options: [
          {
            id: "fatigue_breathless_chest",
            label: "Extreme exhaustion with shortness of breath or dizziness on standing",
            urgency: "PRIORITY",
            manglish: "Ksheenam, shwasam muttal, thala karakkam",
            malayalam: "അമിത ക്ഷീണത്തോടൊപ്പം ശ്വാസംമുട്ടലോ തലകറക്കമോ"
          },
          {
            id: "fatigue_weight_changes",
            label: "Fatigue accompanied by unexplained weight gain/loss and hair thinning",
            manglish: "Ksheenam, thookam kooduka/kurayuka, mudi kozhiyal",
            malayalam: "ക്ഷീണം, ഭാരവ്യത്യാസം, മുടികൊഴിച്ചിൽ"
          },
          {
            id: "chronic_daily_tiredness",
            label: "Persistent daily tiredness, poor sleep, low energy",
            manglish: "Dhivsavum ulla ksheenam, urakkakkuravu",
            malayalam: "ദിവസേനയുള്ള കഠിനമായ ക്ഷീണവും ഉറക്കക്കുറവും"
          }
        ]
      }
    ]
  },
  weight_loss: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "weight_loss_features",
        priority: 1,
        type: "single_select",
        question: "Have you lost significant weight without dieting, or noticed fever or night sweats?",
        manglish: "Diet cheyyathe thanne thookam kuranjathano, koodathe paniyo night sweats undo?",
        malayalam: "ഭക്ഷണക്രമം മാറ്റാതെ കാര്യമായി ഭാരം കുറഞ്ഞതാണോ? പനിയോ രാത്രിയിൽ അമിത വിയർപ്പോ ഉണ്ടോ?",
        options: [
          {
            id: "rapid_unexplained_loss",
            label: "More than 5 kg lost rapidly with fever, night sweats, or loss of appetite",
            urgency: "PRIORITY",
            manglish: "Vegam 5 kg-il kooduthal kuranju, vishappilla, pani",
            malayalam: "വേഗത്തിൽ 5 കിലോയിൽ കൂടുതൽ കുറഞ്ഞു, വിശപ്പില്ലായ്മ, പനി"
          },
          {
            id: "gradual_loss_with_thirst",
            label: "Weight loss with frequent urination and excessive thirst",
            manglish: "Thookam kuranju, kooduthal daaham, muthram ozhikkal",
            malayalam: "ഭാരം കുറയുന്നു, അമിത ദാഹവും കൂടെക്കൂടെ മൂത്രമൊഴിക്കലും"
          },
          {
            id: "mild_steady_loss",
            label: "Gradual modest weight reduction over months",
            manglish: "Cheriya reethiyil kurayunnu",
            malayalam: "മാസങ്ങളായി ക്രമേണ കുറയുന്നു"
          }
        ]
      }
    ]
  },
  weight_gain: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "weight_gain_features",
        priority: 1,
        type: "single_select",
        question: "Has the weight gain happened rapidly, or is there swelling in your legs or face?",
        manglish: "Thookam pettannu koodiyathano, kalukalilo mughatho vekkam undo?",
        malayalam: "ശരീരഭാരം പെട്ടെന്ന് കൂടിയതാണോ? കാലിലോ മുഖത്തോ നീർക്കെട്ട് ഉണ്ടോ?",
        options: [
          {
            id: "rapid_fluid_swelling",
            label: "Sudden weight gain within days with breathlessness or leg swelling",
            urgency: "PRIORITY",
            manglish: "Pettannu koodi, shwasam muttal, kaalil vekkam",
            malayalam: "കുറഞ്ഞ ദിവസത്തിനുള്ളിൽ ഭാരം കൂടി, ശ്വാസംമുട്ടൽ, കാലിൽ നീര്"
          },
          {
            id: "hormonal_weight_gain",
            label: "Gradual weight gain with sluggishness, cold sensitivity, and dry skin",
            manglish: "Urakkam thooval, kuliru sahikkan pattathilla, thookam koodi",
            malayalam: "തണുപ്പ് സഹിക്കാൻ പറ്റാത്ത അവസ്ഥ, മന്ദത, ഭാരം കൂടുന്നു"
          },
          {
            id: "dietary_gradual_gain",
            label: "Slow weight gain over several months to years",
            manglish: "Pande thotte koodi varunnu",
            malayalam: "കുറെ നാളുകളായി പതുക്കെ ഭാരം കൂടുന്നു"
          }
        ]
      }
    ]
  },
  night_sweats: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "night_sweats_features",
        priority: 1,
        type: "single_select",
        question: "Are your clothes or bed sheets drenched in sweat, and is there fever or swollen glands?",
        manglish: "Rathri thuni nanayunna reethiyil viyarppu undo, paniyo kazhalukalil vekkamo undo?",
        malayalam: "രാത്രിയിൽ വസ്ത്രങ്ങൾ നനയുന്ന വിധം വിയർക്കാറുണ്ടോ? പനിയോ കഴല വീക്കമോ ഉണ്ടോ?",
        options: [
          {
            id: "drenching_with_fever_nodes",
            label: "Drenching night sweats with unexplained fever and swollen neck/armpit glands",
            urgency: "PRIORITY",
            manglish: "Kadinamaya viyarppu, pani, kazhal vekkam",
            malayalam: "കഠിനമായ വിയർപ്പ്, പനി, കഴുത്തിലോ കക്ഷത്തിലോ കഴല വീക്കം"
          },
          {
            id: "sweats_with_hot_flashes",
            label: "Hot flashes and sweating related to menopausal transitions",
            manglish: "Hot flashes, shareeram choodavuka",
            malayalam: "ശരീരം വല്ലാതെ ചൂടായി വിയർക്കൽ (ആർത്തവവിരാമ ലക്ഷണങ്ങൾ)"
          },
          {
            id: "occasional_night_sweating",
            label: "Occasional sweating depending on room temperature or blankets",
            manglish: "Idakkide choodu karanam mathram",
            malayalam: "ചൂട് കൂടുമ്പോൾ മാത്രം ഉണ്ടാകുന്നത്"
          }
        ]
      }
    ]
  },

  // ═══ 2. HEAD / NEUROLOGICAL ═══
  headache_migraine: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "headache_warning_features",
        priority: 1,
        type: "single_select",
        question: "Is this the sudden worst headache of your life, or are you having vision loss or weakness?",
        manglish: "Pettannu vanna kadinamaya thalavedanayo, kazhcha kuravo, oru bhagathu thalarcho undo?",
        malayalam: "പെട്ടെന്നുണ്ടായ അതികഠിനമായ തലവേദനയാണോ? കാഴ്ചക്കുറവോ, ഒരു വശത്ത് തളർച്ചയോ ഉണ്ടോ?",
        options: [
          {
            id: "thunderclap_neuro",
            label: "Sudden explosive 'thunderclap' headache or weakness/speech slurring",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Thunderclap koodiya vedana / samsaram kulangal",
            malayalam: "പെട്ടെന്നുണ്ടായ അതികഠിനമായ തലവേദന / സംസാരത്തിന് കുഴച്ചിൽ"
          },
          {
            id: "throbbing_migraine",
            label: "Throbbing one-sided headache with nausea, light or sound sensitivity",
            manglish: "Oru bhagathu thudikkunna vedana, chardi, velicham sahikkan pattilla",
            malayalam: "തലയുടെ ഒരു വശത്ത് മാത്രമുള്ള വേദന, ഛർദ്ദി, വെളിച്ചം ബുദ്ധിമുട്ടാകൽ"
          },
          {
            id: "tension_band_like",
            label: "Dull pressure like a tight band around the whole head",
            manglish: "Thalayil kettiya pole ulla vedana, manasika vishamangal",
            malayalam: "തലയിൽ ഭാരം വെച്ചതുപോലെയുള്ള സ്ഥിരമായ വേദന"
          }
        ]
      }
    ]
  },
  dizziness_vertigo: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "dizziness_type",
        priority: 1,
        type: "single_select",
        question: "Does the room feel like it is spinning around you, or do you feel lightheaded/faint?",
        manglish: "Muri chuttunnathupole thonnunno, atho bodham kettu veezhan pokunnapole aano?",
        malayalam: "മുറി കറങ്ങുന്നതുപോലെയാണോ അനുഭവപ്പെടുന്നത്, അതോ തലകറങ്ങി ബോധം മറയുന്നതുപോലെയാണോ?",
        options: [
          {
            id: "spinning_with_hearing_loss",
            label: "True spinning (vertigo) with ear ringing, fullness, or hearing loss",
            manglish: "Karakkam, cheviyil shabdam, kelvi kuravu",
            malayalam: "തലകറക്കം, ചെവിയിൽ ഇരച്ചിൽ അല്ലെങ്കിൽ കേൾവിക്കുറവ്"
          },
          {
            id: "dizziness_with_chest_faint",
            label: "Lightheadedness with chest fluttering, shortness of breath, or blackouts",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Kannil iruttu kayaral, nenjidippu, veezhan pokal",
            malayalam: "കണ്ണിൽ ഇരുട്ട് കയറൽ, നെഞ്ചിടിപ്പ്, ബോധംകെട്ടു വീഴൽ"
          },
          {
            id: "positional_spinning_brief",
            label: "Brief spinning lasting seconds when turning head or rolling over in bed",
            manglish: "Thala thirikkumbol mathram kurachu second karangunnu",
            malayalam: "തല തിരിക്കുമ്പോഴോ കിടന്നു തിരിയുമ്പോഴോ മാത്രം വരുന്ന കറക്കം"
          }
        ]
      }
    ]
  },
  seizure: {
    requiresSeverity: false,
    requiresDuration: false,
    questions: [
      {
        id: "seizure_safety",
        priority: 1,
        type: "single_select",
        question: "Did jerking/fits occur, was there loss of consciousness, or is the person still confused?",
        manglish: "Kayyo kaalo vettikkal undayo, bodham poyo, aal ippozhum mayakathil aano?",
        malayalam: "കൈകാലുകൾ വെട്ടുകയോ ബോധക്ഷയമോ ഉണ്ടായോ? വ്യക്തി ഇപ്പോഴും ആശയക്കുഴപ്പത്തിലാണോ?",
        options: [
          {
            id: "active_or_first_seizure",
            label: "First-time seizure, ongoing fitting, or slow to wake up",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Adhyamayi vanna seizure / bodham thelinjittilla",
            malayalam: "ആദ്യമായി ഉണ്ടായ അപസ്മാരം / ഇതുവരെ ബോധം തെളിഞ്ഞിട്ടില്ല"
          },
          {
            id: "known_epileptic_recovered",
            label: "Known epilepsy patient, fully alert now, seeking medication review",
            manglish: "Epilepsy ulla aal, ippo kuttamillya",
            malayalam: "മുൻപ് അസുഖമുള്ള വ്യക്തി, ഇപ്പോൾ പൂർണ്ണ ബോധമുണ്ട്"
          }
        ]
      }
    ]
  },
  sudden_speech_difficulty: {
    requiresSeverity: false,
    requiresDuration: false,
    questions: [
      {
        id: "stroke_speech_screen",
        priority: 1,
        type: "single_select",
        question: "Did speech slurring, word-finding difficulty, or facial drooping start suddenly?",
        manglish: "Samsarathinte kolaru, vakukal kittathirikukayo mugham konatukayo pettannu thudangiyathano?",
        malayalam: "സംസാരത്തിന് കുഴച്ചിലോ, വാക്കുകൾ കിട്ടായ്മയോ, മുഖം ഒരു വശത്തേക്ക് കോടലോ പെട്ടെന്നുണ്ടായതാണോ?",
        options: [
          {
            id: "acute_stroke_signs",
            label: "Yes — Sudden speech slurring, confusion, or arm weakness (Stroke Warning)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Athe — Pettannu samsaram kulangi / kayyo kaalo thalarnnu",
            malayalam: "അതെ — പെട്ടെന്ന് സംസാരം കുഴഞ്ഞു / കൈകാലുകൾക്ക് ബലക്കുറവ് (സ്ട്രോക്ക് ലക്ഷണം)"
          },
          {
            id: "gradual_hoarseness_voice",
            label: "Voice is hoarse or husky due to throat cold, but words and speech are clear",
            manglish: "Shabdam idari, pakshe parayan pattunnu",
            malayalam: "തൊണ്ടയടപ്പുകൊണ്ട് ശബ്ദം മാറിയതാണ്, സംസാരം വ്യക്തമാണ്"
          }
        ]
      }
    ]
  },
  facial_weakness: {
    requiresSeverity: false,
    requiresDuration: false,
    questions: [
      {
        id: "facial_palsy_features",
        priority: 1,
        type: "single_select",
        question: "Is one side of the face drooping, unable to close one eye, or is there arm/leg weakness?",
        manglish: "Mughathinte oru bhagam thalarnno, oru kannu adakkan pattathilla, kayyinu balakkuravundo?",
        malayalam: "മുഖത്തിന്റെ ഒരു വശം തളർന്നോ? ഒരു കണ്ണ് അടയ്ക്കാൻ പറ്റുന്നില്ലേ? കൈകാലുകൾക്ക് തളർച്ചയുണ്ടോ?",
        options: [
          {
            id: "facial_with_limb_weakness",
            label: "Facial weakness accompanied by arm/leg weakness or slurred speech",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Mughavum kayyum thalarnnu, samsaram kulangi",
            malayalam: "മുഖത്തോടൊപ്പം കൈകാലുകൾക്കും തളർച്ചയും സംസാര വൈകല്യവും"
          },
          {
            id: "isolated_bells_palsy",
            label: "Isolated one-sided facial drooping and eye closure difficulty, limbs normal",
            urgency: "PRIORITY",
            manglish: "Mugham mathram koni, kannadakkan pattilla (Bell's palsy)",
            malayalam: "മുഖത്ത് മാത്രം കോടലും കണ്ണ് അടയ്ക്കാൻ ബുദ്ധിമുട്ടും (ബെൽസ് പാൾസി)"
          }
        ]
      }
    ]
  },
  numbness_tingling: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "numbness_distribution",
        priority: 1,
        type: "single_select",
        question: "Where is the numbness or tingling, and is there any loss of bladder control or weakness?",
        manglish: "Tharippo maravippo evideyanu, muthram thadayan pattathirikukayo thalarchayo undo?",
        malayalam: "തരിപ്പോ മരവിപ്പോ എവിടെയാണ്? മൂത്രം പിടിച്ചുനിർത്താൻ ബുദ്ധിമുട്ടോ തളർച്ചയോ ഉണ്ടോ?",
        options: [
          {
            id: "numbness_with_incontinence",
            label: "Sudden one-sided body numbness or loss of bladder/bowel control",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Oru bhagam muzhuvan maravichu, muthram kooduthal aayi pokunnu",
            malayalam: "ശരീരത്തിന്റെ ഒരു വശം മുഴുവൻ മരവിപ്പ് അല്ലെങ്കിൽ മലമൂത്ര വിസർജ്ജന നിയന്ത്രണം നഷ്ടപ്പെടൽ"
          },
          {
            id: "sciatica_shooting_numbness",
            label: "Numbness shooting from lower back down one leg to feet (Sciatica)",
            manglish: "Iduppil ninnu kaalilekku tharichu kayarunnu",
            malayalam: "ഇടുപ്പിൽ നിന്ന് കാലിലേക്ക് പടരുന്ന മരവിപ്പും വേദനയും"
          },
          {
            id: "hands_feet_glove_stocking",
            label: "Pins and needles in both hands and feet (Diabetic/Peripheral Neuropathy)",
            manglish: "Randu kayyilum kaalilum tharippu",
            malayalam: "രണ്ട് കൈകാലുകളിലും സ്ഥിരമായി ഉണ്ടാകുന്ന തരിപ്പ്"
          }
        ]
      }
    ]
  },
  tremor: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "tremor_characteristics",
        priority: 1,
        type: "single_select",
        question: "Do your hands shake when resting, or only when reaching for an object?",
        manglish: "Kayyinte virayal chumma irikkumbozhano, atho enthengilum edukumbozhano?",
        malayalam: "കൈവിറയൽ വെറുതെയിരിക്കുമ്പോഴാണോ അതോ എന്തെങ്കിലും എടുക്കുമ്പോഴാണോ അനുഭവപ്പെടുന്നത്?",
        options: [
          {
            id: "resting_tremor_stiffness",
            label: "Shaking hands when resting, accompanied by slow movement or stiffness",
            manglish: "Irikkumbol virayunnu, nadakkan thaammasam",
            malayalam: "വെറുതെയിരിക്കുമ്പോൾ വിറയൽ, ചലനങ്ങൾക്ക് മന്ദതയും ശരീര വഴക്കക്കുറവും"
          },
          {
            id: "action_tremor_stress",
            label: "Shaking only when writing, holding a cup, or during stress/caffeine",
            manglish: "Ezhuthumbol, chaya kudikkumbol mathram virayunnu",
            malayalam: "എഴുതുമ്പോഴോ ചായ കുടിക്കുമ്പോഴോ മാത്രം വിറയ്ക്കുന്നത്"
          }
        ]
      }
    ]
  },
  confusion: {
    requiresSeverity: false,
    requiresDuration: false,
    questions: [
      {
        id: "confusion_acuteness",
        priority: 1,
        type: "single_select",
        question: "Did this confusion begin suddenly over hours, and is there high fever, headache, or fall?",
        manglish: "Bodham kuttamillya aavuka pettannano, koode paniyo thalayadikkalo undo?",
        malayalam: "ആശയക്കുഴപ്പവും മറവിയും പെട്ടെന്നുണ്ടായതാണോ? പനിയോ തലയ്ക്കടിയോ ഏറ്റിരുന്നോ?",
        options: [
          {
            id: "acute_delirium_emergency",
            label: "Acute sudden disorientation, hallucinations, or drowsiness with fever/head injury",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Pettannu aale manasilakatha avastha, mayakkam, pani",
            malayalam: "ആളുകളെ തിരിച്ചറിയാൻ പറ്റാത്ത പെട്ടെന്നുള്ള അവസ്ഥ, മയക്കം, പനി"
          },
          {
            id: "gradual_memory_loss",
            label: "Gradual forgetfulness and memory issues developing over months or years",
            manglish: "Kure naalayi ulla maravi (Dementia/Memory loss)",
            malayalam: "മാസങ്ങളായുള്ള ക്രമേണയുള്ള മറവി"
          }
        ]
      }
    ]
  },

  // ═══ 3. EYE ═══
  eye_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "eye_pain_severity",
        priority: 1,
        type: "single_select",
        question: "Is there sudden severe deep eye ache with halos around lights, or recent chemical/injury?",
        manglish: "Kannil koodiya vedana, velichathinu chuttum niram thonnal, kemikkal vellamo injury undo?",
        malayalam: "കണ്ണിൽ അതികഠിനമായ വേദന, വെളിച്ചത്തിന് ചുറ്റും വലയം കാണൽ, അല്ലെങ്കിൽ മുറിവേറ്റതാണോ?",
        options: [
          {
            id: "severe_glaucoma_trauma",
            label: "Severe deep ache with cloudy vision, nausea, halos, or chemical burn",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Kadinamaya vedana, kazhcha mangal, chardi, chemical",
            malayalam: "കഠിനമായ വേദന, കാഴ്ച മങ്ങൽ, ഛർദ്ദി, കെമിക്കൽ വീഴൽ"
          },
          {
            id: "foreign_body_scratch",
            label: "Gritty foreign body sensation, scratchy feeling or contact lens pain",
            urgency: "PRIORITY",
            manglish: "Kannil karadu poya pole, tharikkunnu",
            malayalam: "കണ്ണിൽ കരട് പോയതുപോലെ തരിപ്പും ചൊറിച്ചിലും"
          },
          {
            id: "eyestrain_mild",
            label: "Dull ache around eyes after heavy screen use or reading",
            manglish: "Mobile/computer upayogichitulla vedana",
            malayalam: "സ്ക്രീൻ ഉപയോഗം കൊണ്ടുള്ള നേരിയ വേദന"
          }
        ]
      }
    ]
  },
  blurred_vision: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "vision_loss_onset",
        priority: 1,
        type: "single_select",
        question: "Did the vision blur suddenly in one eye, or are you seeing flashing lights/dark curtains?",
        manglish: "Pettannu kazhcha mangiyathano, minnal pole velichamo karutha thira poleyo thonnunno?",
        malayalam: "ഒരു കണ്ണിൽ പെട്ടെന്ന് കാഴ്ച മങ്ങിയതാണോ? മിന്നൽ വെളിച്ചമോ ഇരുണ്ട തിരശ്ശീലയോ കാണുന്നുണ്ടോ?",
        options: [
          {
            id: "sudden_painless_vision_loss",
            label: "Sudden loss of vision, floaters/flashes of light, or shadow like a curtain",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Pettannu kazhcha poyi / flashes / dark curtain",
            malayalam: "പെട്ടെന്ന് കാഴ്ച മങ്ങുകയോ നഷ്ടപ്പെടുകയോ ചെയ്യുക"
          },
          {
            id: "gradual_blurring",
            label: "Gradual blurry vision over months when reading or driving (Cataract/Refractive)",
            manglish: "Pothuve kazhcha mangunnu, kannada venamennu thonnunnu",
            malayalam: "കുറെ നാളായി പതുക്കെ കാഴ്ച മങ്ങിവരുന്നു"
          }
        ]
      }
    ]
  },
  red_eye: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "red_eye_features",
        priority: 1,
        type: "single_select",
        question: "Is there yellow discharge, light sensitivity, or severe pain in the red eye?",
        manglish: "Kannezhuthu chuvappano, peela ketti adakkunnundo, velicham nokkan pattathilla?",
        malayalam: "കണ്ണിൽ ചുവപ്പോടൊപ്പം പഴുപ്പോ, വെളിച്ചത്തിലേക്ക് നോക്കാൻ ബുദ്ധിമുട്ടോ ഉണ്ടോ?",
        options: [
          {
            id: "red_eye_pain_photophobia",
            label: "Red eye with severe pain, corneal haze, or intense light sensitivity",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Koodiya vedana, velichathil nokkan pattilla",
            malayalam: "കണ്ണിൽ കഠിനമായ വേദന, വെളിച്ചത്തിൽ നോക്കാൻ പറ്റായ്മ"
          },
          {
            id: "conjunctivitis_discharge",
            label: "Watery or sticky yellow/white discharge, eyelids stuck together in morning",
            manglish: "Manja peela ketti kannadanjirikkunnu (Madras Eye)",
            malayalam: "മഞ്ഞ പീള കെട്ടി കണ്ണ് അടഞ്ഞുപോവുക (ചെങ്കണ്ണ്)"
          },
          {
            id: "allergic_itchy_red",
            label: "Both eyes itchy, watery, and red without significant pain",
            manglish: "Chorichil, vellam varal, cheruthayi chuvannu",
            malayalam: "ചൊറിച്ചിലും കണ്ണിൽ നിന്ന് വെള്ളം വരികയും ചെയ്യുക"
          }
        ]
      }
    ]
  },
  eye_discharge: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "discharge_type",
        priority: 1,
        type: "single_select",
        question: "What is the eye discharge like, and is there swelling or severe pain?",
        manglish: "Kannil ninnu varunna peela enganeyanu, vekkamo koodiya vedanayo undo?",
        malayalam: "കണ്ണിൽ നിന്ന് വരുന്നത് എങ്ങനെയുള്ളതാണ്? വീക്കമോ കഠിനമായ വേദനയോ ഉണ്ടോ?",
        options: [
          {
            id: "purulent_thick_pus",
            label: "Thick continuous yellow/green pus with red eye and swollen lids",
            urgency: "PRIORITY",
            manglish: "Kattiyaya manja peela / puzhappu",
            malayalam: "കട്ടിയുള്ള മഞ്ഞ/പച്ച പഴുപ്പും കണ്പോള വീക്കവും"
          },
          {
            id: "watery_clear_discharge",
            label: "Clear watery tearing with mild irritation or itchy feeling",
            manglish: "Thelinja vellam pole mathram",
            malayalam: "വ്യക്തമായ കണ്ണീരൊഴുക്കും നേരിയ അസ്വസ്ഥതയും"
          }
        ]
      }
    ]
  },

  // ═══ 4. ENT ═══
  ear_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "ear_pain_signs",
        priority: 1,
        type: "single_select",
        question: "Is there discharge from the ear, swelling behind the ear, or high fever?",
        manglish: "Cheviyil ninnu neer/chora varunnundo, chevikku purakil vekkamo, paniyo undo?",
        malayalam: "ചെവിയിൽ നിന്ന് ചലമോ ചോരയോ വരുന്നുണ്ടോ? ചെവിക്ക് പിന്നിൽ നീരോ പനിയോ ഉണ്ടോ?",
        options: [
          {
            id: "mastoid_swelling_bleeding",
            label: "Tender swelling behind ear bone, ear bleeding, or severe high fever",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Chevikku purakil thadippu, chora varal, pani",
            malayalam: "ചെവിക്ക് പിന്നിൽ നീർക്കെട്ട്, രക്തസ്രാവം, കടുത്ത പനി"
          },
          {
            id: "ear_infection_fluid",
            label: "Throbbing ear pain with yellowish fluid discharge and muffled hearing",
            urgency: "PRIORITY",
            manglish: "Chevi vedana, puzhappu varal, kelvi kuravu",
            malayalam: "ചെവിവേദന, പഴുപ്പ് പുറത്തേക്ക് വരിക, കേൾവിക്കുറവ്"
          },
          {
            id: "swimmers_itchy_pain",
            label: "Pain when pulling earlobe or chewing, itchy ear canal",
            manglish: "Chevi thottaal vedanikkunnu, chorichil",
            malayalam: "ചെവി തൊടുമ്പോൾ വേദന, ചെവിക്കുള്ളിൽ ചൊറിച്ചിൽ"
          }
        ]
      }
    ]
  },
  tinnitus: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "ear_laterality",
        priority: 1,
        type: "single_select",
        question: "Is the ringing in one ear or both ears, and did hearing suddenly drop?",
        manglish: "Shabdam oru cheviyilo atho randilumo, pettannu kelvi kuranjo?",
        malayalam: "ശബ്ദം ഒരു ചെവിയിലാണോ അതോ രണ്ടിലും ഉണ്ടോ? പെട്ടെന്ന് കേൾവി കുറഞ്ഞോ?",
        options: [
          {
            id: "sudden_unilateral_drop",
            label: "Sudden ringing in one ear with sudden drop in hearing",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Oru cheviyil pettannu shabdam, kelvi poyi",
            malayalam: "ഒരു ചെവിയിൽ പെട്ടെന്ന് ഇരച്ചിൽ, കേൾവി പെട്ടെന്ന് നഷ്ടപ്പെടൽ"
          },
          {
            id: "both_ears_gradual",
            label: "Constant buzzing or humming in both ears, normal hearing",
            manglish: "Randu cheviyilum kure naalayi ulla shabdam",
            malayalam: "രണ്ട് ചെവിയിലും നാളുകളായി കേൾക്കുന്ന ഇരച്ചിൽ"
          }
        ]
      }
    ]
  },
  hearing_difficulty: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "hearing_loss_onset",
        priority: 1,
        type: "single_select",
        question: "Did you wake up unable to hear in one ear, or has it been fading slowly?",
        manglish: "Oru cheviyil pettannu kelvi poyathano, atho kure naalayi kuranjathano?",
        malayalam: "ഒരു ചെവിയിൽ പെട്ടെന്ന് കേൾവി നിലച്ചതാണോ, അതോ ക്രമേണ കുറഞ്ഞുവന്നതാണോ?",
        options: [
          {
            id: "sudden_sensorineural_emergency",
            label: "Sudden hearing loss within hours or days (Medical Emergency for ENT)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Pettannu kelvi poyi (urgent ENT evaluation)",
            malayalam: "പെട്ടെന്ന് കേൾവി നഷ്ടപ്പെട്ടു (ഉടൻ ഡോക്ടറെ കാണുക)"
          },
          {
            id: "blocked_wax_cold",
            label: "Ear feels blocked after swimming, cold, or earwax buildup",
            manglish: "Cheviyil azhukku/vellam ketti kettu poyathupole",
            malayalam: "ചെവിയിൽ അഴുക്കോ വെള്ളമോ കയറി അടഞ്ഞതുപോലെ"
          },
          {
            id: "age_related_gradual",
            label: "Gradual difficulty hearing conversations over years",
            manglish: "Kure naalayi samsaram kettan thaammasam",
            malayalam: "പ്രായം കൊണ്ടോ മറ്റോ ക്രമേണയുള്ള കേൾവിക്കുറവ്"
          }
        ]
      }
    ]
  },
  sore_throat: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "sore_throat_severity",
        priority: 1,
        type: "single_select",
        question: "Can you swallow your own saliva, and is there breathing difficulty or high fever?",
        manglish: "Uminneeru erakkan pattunnundo, shwasam muttalo koodiya paniyo undo?",
        malayalam: "ഉമിനീര് പോലും ഇറക്കാൻ ബുദ്ധിമുട്ടുണ്ടോ? ശ്വാസമെടുക്കാൻ തടസ്സമോ കടുത്ത പനിയോ ഉണ്ടോ?",
        options: [
          {
            id: "throat_drooling_breathing_stridor",
            label: "Unable to swallow fluids/saliva, drooling, or noisy breathing",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Uminneeru erakkan pattilla, shwasam muttal",
            malayalam: "ഉമിനീരിറക്കാൻ പറ്റാതെ ഒഴുകൽ, ശ്വാസമെടുക്കാൻ വലിവും ശബ്ദവും"
          },
          {
            id: "tonsillitis_white_patches",
            label: "Severe pain swallowing, swollen tonsils with white spots and fever",
            urgency: "PRIORITY",
            manglish: "Thondavedana, tonsilsil vella koodukal, pani",
            malayalam: "കഠിനമായ തൊണ്ടവേദന, ടോൺസിൽസിൽ വെള്ളപ്പാടുകൾ, പനി"
          },
          {
            id: "mild_scratchy_throat",
            label: "Scratchy dry throat with mild common cold or runny nose",
            manglish: "Cheriya thonda chidichil, jaladosham",
            malayalam: "നേരിയ തൊണ്ട ചൊറിച്ചിലും ജലദോഷവും"
          }
        ]
      }
    ]
  },
  difficulty_swallowing: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "dysphagia_food_type",
        priority: 1,
        type: "single_select",
        question: "Do solids or liquids get stuck, and is there coughing, choking, or weight loss?",
        manglish: "Chorum vellavum erakkumbol thadannu pokunno, chuma varalundo?",
        malayalam: "ഭക്ഷണമോ വെള്ളമോ ഇറക്കുമ്പോൾ തൊണ്ടയിൽ തടയുന്നുണ്ടോ? ചുമയോ ശ്വാസതടസ്സമോ ഉണ്ടാകാറുണ്ടോ?",
        options: [
          {
            id: "choking_regurgitation_loss",
            label: "Choking on liquids, food coming back up, or unexplained weight loss",
            urgency: "PRIORITY",
            manglish: "Choking aavuka, bhakshanam thirichu varuka, thookam kurayal",
            malayalam: "ഭക്ഷണം കഴിക്കുമ്പോൾ ശ്വാസതടസ്സം, ഛർദ്ദിച്ചു പോകൽ, ഭാരം കുറയൽ"
          },
          {
            id: "solids_sticking_chest",
            label: "Solid foods feel like they stick in the mid-chest area",
            manglish: "Katti bhakshanam nenjil thadannu nilkkunnu",
            malayalam: "കട്ടിയുള്ള ഭക്ഷണം നെഞ്ചിന്റെ ഭാഗത്ത് തടഞ്ഞുനിൽക്കുന്നു"
          },
          {
            id: "painful_swallowing_cold",
            label: "Painful swallowing during a cold or throat infection",
            manglish: "Jaladosham samayathulla vedana",
            malayalam: "ജലദോഷം കാരണം ഭക്ഷണം ഇറക്കുമ്പോഴുള്ള വേദന"
          }
        ]
      }
    ]
  },
  hoarseness: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "hoarseness_duration",
        priority: 1,
        type: "single_select",
        question: "Has your voice been hoarse for more than 3 weeks, and is there any neck lump?",
        manglish: "Shabdam poyi 3 aazhchayil kooduthal aayo, kazhuthil vekkamo undundo?",
        malayalam: "ശബ്ദമടപ്പ് 3 ആഴ്ചയിൽ കൂടുതലായി ഉണ്ടോ? കഴുത്തിൽ തടിപ്പോ മുഴയോ ഉണ്ടോ?",
        options: [
          {
            id: "prolonged_hoarse_with_lump",
            label: "Hoarseness lasting > 3 weeks, especially with smoking history or neck lump",
            urgency: "PRIORITY",
            manglish: "3 aazhchayil koodi, kazhuthil muzha, pukavali",
            malayalam: "3 ആഴ്ചയിലധികം നീണ്ടുനിൽക്കുന്ന ശബ്ദമടപ്പ്, കഴുത്തിൽ മുഴ"
          },
          {
            id: "acute_voice_strain",
            label: "Voice lost after loud shouting, singing, or acute viral cold",
            manglish: "Kooduthal samsaricho paadiyo shabdam poyathu",
            malayalam: "കൂടുതൽ സംസാരിച്ചോ ഒച്ചയിട്ടോ ജലദോഷം കാരണമോ ഉണ്ടായത്"
          }
        ]
      }
    ]
  },
  blocked_nose: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "blocked_nose_laterality",
        priority: 1,
        type: "single_select",
        question: "Is the blockage in one nostril only, or both nostrils with facial headache?",
        manglish: "Mookkadappu oru thulayil mathramano, atho randilumo koode thalavedanayo undo?",
        malayalam: "മൂക്കടപ്പ് ഒരു വശത്ത് മാത്രമാണോ അതോ രണ്ടിലും ഉണ്ടോ? മുഖത്തോ നെറ്റിയിലോ വേദനയുണ്ടോ?",
        options: [
          {
            id: "sinus_pain_yellow_pus",
            label: "Both nostrils blocked with severe forehead pain and thick green/yellow discharge",
            manglish: "Koodiya thalavedana, manja kapham, mookkadappu",
            malayalam: "മുഖത്തും നെറ്റിയിലും കഠിനമായ വേദനയും മഞ്ഞ/പച്ച കഫവും"
          },
          {
            id: "unilateral_persistent_block",
            label: "One nostril persistently blocked for months without relief",
            manglish: "Oru thula mathram eppozhum adanju nilkkunnu",
            malayalam: "ഒരു വശത്തെ മൂക്ക് മാത്രം എപ്പോഴും അടഞ്ഞിരിക്കുന്നു"
          },
          {
            id: "seasonal_allergic_block",
            label: "Alternating blockage with sneezing and watery nose",
            manglish: "Thummal, mookkil ninnu vellam varal",
            malayalam: "തുമ്മലും മൂക്കൊലിപ്പും മാറിമാറി വരുന്ന മൂക്കടപ്പും"
          }
        ]
      }
    ]
  },
  runny_nose: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "runny_nose_fluid",
        priority: 1,
        type: "single_select",
        question: "Is it clear watery fluid dripping like water, or thick yellow mucus with fever?",
        manglish: "Vellam pole olikkunnathano, atho kattiyulla manja neerum paniyum undo?",
        malayalam: "വെള്ളംപോലെ മൂക്കൊലിക്കുന്നതാണോ അതോ മഞ്ഞനിറത്തിൽ കട്ടിയുള്ള കഫവും പനിയുമുണ്ടോ?",
        options: [
          {
            id: "clear_after_head_trauma",
            label: "Clear salty water dripping constantly from one nostril after head injury",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Thalayadicha sesham mookkil ninnu thelinja vellam",
            malayalam: "തലയ്ക്കടിയേറ്റ ശേഷം മൂക്കിൽ നിന്ന് നിർവിഘ്നം തെളിഞ്ഞ വെള്ളം വരിക"
          },
          {
            id: "cold_flu_mucus",
            label: "Thick yellow/green nasal discharge with fever and body aches",
            manglish: "Kattiyulla kapham, pani, shareera vedana",
            malayalam: "കട്ടിയുള്ള കഫവും പനിയും ശരീരവേദനയും"
          },
          {
            id: "clear_allergic_drip",
            label: "Clear runny nose with frequent sneezing and itchy nose/eyes",
            manglish: "Thummalodu koode ulla mookkollippu",
            malayalam: "തുമ്മലോടെയുള്ള സാധാരണ മൂക്കൊലിപ്പ്"
          }
        ]
      }
    ]
  },
  sneezing: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "sneezing_triggers",
        priority: 1,
        type: "single_select",
        question: "Do bouts of sneezing occur in the morning, around dust, pets, or with asthma?",
        manglish: "Ravile ezhunelkkumbol thummal koodunno, podi kandaal thummalo shwasam muttalo undo?",
        malayalam: "രാവിലെ എഴുന്നേൽക്കുമ്പോഴോ പൊടി അടിക്കുമ്പോഴോ തുമ്മൽ വരാറുണ്ടോ? ശ്വാസംമുട്ടൽ ഉണ്ടോ?",
        options: [
          {
            id: "sneezing_with_wheeze",
            label: "Frequent sneezing accompanied by chest tightness, wheezing, or breathlessness",
            urgency: "PRIORITY",
            manglish: "Thummal, nenjil kooval/wheezing, shwasam muttal",
            malayalam: "തുമ്മലിനൊപ്പം നെഞ്ചിൽ വിസിലടി പോലുള്ള ശബ്ദവും ശ്വാസംമുട്ടലും"
          },
          {
            id: "allergic_rhinitis_dust",
            label: "Morning sneezing bouts, itchy palate/eyes, triggered by dust or pollen",
            manglish: "Ravile 10-15 thummal, kannu chorichil",
            malayalam: "രാവിലെയുള്ള തുമ്മലും കണ്ണ്/മൂക്ക് ചൊറിച്ചിലും"
          }
        ]
      }
    ]
  },
  sinus_pressure: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "sinus_focal_area",
        priority: 1,
        type: "single_select",
        question: "Does bending your head forward worsen facial pain, and is there tooth/eye ache?",
        manglish: "Thala thazhthumbol mughathum nethiyilum vedana koodunno, pallu vedana undo?",
        malayalam: "തല കുനിക്കുമ്പോൾ നെറ്റിയിലും കവിളിലും വേദന കൂടുന്നുണ്ടോ? പല്ലുവേദന ഉണ്ടോ?",
        options: [
          {
            id: "sinus_with_eye_swelling",
            label: "Facial pain with eye swelling, redness, double vision, or stiff neck",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Kannil vekkam, kazhcha irattikkal, koodiya vedana",
            malayalam: "കണ്ണിന് ചുറ്റും നീരും തടിപ്പും, കാഴ്ചയിൽ ഇരട്ടിപ്പ്"
          },
          {
            id: "acute_bacterial_sinusitis",
            label: "Pain over cheekbones and forehead, worse bending down, thick green nasal pus",
            manglish: "Nethi vedana, thala kunikkumbol koodunnu, puzhappu",
            malayalam: "നെറ്റിയിലും കവിളിലും വേദന, കുനിയുമ്പോൾ കൂടൽ, പച്ച കഫം"
          },
          {
            id: "mild_frontal_congestion",
            label: "Mild forehead heaviness during a weather change or common cold",
            manglish: "Thalakkattu, cheruthaya vedana",
            malayalam: "നേരിയ തലക്കനവും ജലദോഷവും"
          }
        ]
      }
    ]
  },
  nosebleed: {
    requiresSeverity: false,
    requiresDuration: false,
    questions: [
      {
        id: "epistaxis_severity",
        priority: 1,
        type: "single_select",
        question: "Has bleeding continued for more than 15 minutes, or did it start after trauma?",
        manglish: "15 minutsil kooduthal aayi chora nilkkathirikukayano, atho idichathano?",
        malayalam: "15 മിനിറ്റിലധികമായി ചോര നിലയ്ക്കാതെ വരുന്നുണ്ടോ? പരിക്കേറ്റതാണോ?",
        options: [
          {
            id: "uncontrolled_bleeding_head_trauma",
            label: "Bleeding not stopping with pinching, following a head injury, or swallowing blood",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Chora nilkkunnilla, thalayadichu, thondakkullilottu chora",
            malayalam: "മൂക്ക് അമർത്തിപ്പിടിച്ചിട്ടും ചോര നിലയ്ക്കുന്നില്ല, തലയ്ക്കടിയേറ്റു"
          },
          {
            id: "recurrent_minor_bleeds",
            label: "Repeated small nosebleeds due to dry weather or nose picking",
            manglish: "Idakkide cheruthayi chora varunnu",
            malayalam: "വരണ്ട കാലാവസ്ഥയിലോ മറ്റോ ഇടയ്ക്കിടെ കുറച്ചു ചോര വരുന്നത്"
          }
        ]
      }
    ]
  },

  // ═══ 5. CHEST / RESPIRATORY ═══
  chest_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "cardiac_red_flags",
        priority: 1,
        type: "single_select",
        question: "Is there crushing chest pressure radiating to left arm/jaw, with sweating or breathlessness?",
        manglish: "Nenjil koodiya bhaaramo, kayyilotto thadayilotto vedana padarunnatho, viyarppo undo?",
        malayalam: "നെഞ്ചിൽ ഭാരമോ, വേദന ഇടതുകൈയിലേക്കോ താടിയിലേക്കോ പടരുകയോ, വിയർപ്പോ ശ്വാസംമുട്ടലോ ഉണ്ടോ?",
        options: [
          {
            id: "heart_attack_emergency",
            label: "Crushing chest tightness, spreading to left arm/jaw, cold sweat, nausea",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Nenjamathal, edathu kayyilekku vedana, viyarppu (Heart attack)",
            malayalam: "നെഞ്ചമർത്തൽ, ഇടതുകൈയിലേക്ക് വേദന, വിയർപ്പും ശ്വാസംമുട്ടലും (ഹാർട്ട് അറ്റാക്ക് ലക്ഷണം)"
          },
          {
            id: "pleuritic_stabbing_breath",
            label: "Sharp stabbing chest pain worsened by taking a deep breath or coughing",
            urgency: "PRIORITY",
            manglish: "Shwasam ullilekku edukkumbol kuthunna vedana",
            malayalam: "ശ്വാസമെടുക്കുമ്പോഴും ചുമയ്ക്കുമ്പോഴും കുത്തുന്ന വേദന"
          },
          {
            id: "burning_reflux_acid",
            label: "Burning discomfort behind breastbone after food or lying down",
            manglish: "Bhakshanam kazhicha sesham nenjerichil",
            malayalam: "ഭക്ഷണശേഷം നെഞ്ചിലും തൊണ്ടയിലും എരിച്ചിൽ"
          }
        ]
      }
    ]
  },
  shortness_of_breath: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "breathlessness_acuteness",
        priority: 1,
        type: "single_select",
        question: "Did shortness of breath start suddenly, are lips turning blue, or can you speak full sentences?",
        manglish: "Shwasam muttal pettannu thudangiyathano, chundu neelikkunno, muzhuvan samsarikkan pattunno?",
        malayalam: "ശ്വാസംമുട്ടൽ പെട്ടെന്നുണ്ടായതാണോ? ചുണ്ടുകൾ നീലനിറമായോ? ഒന്നിച്ച് സംസാരിക്കാൻ കഴിയുന്നുണ്ടോ?",
        options: [
          {
            id: "acute_hypoxia_emergency",
            label: "Severe sudden gasping, blue lips/fingers, unable to speak 3 words together",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Kadinamaya shwasam muttal, samsarikkan pattilla, neela chundu",
            malayalam: "അതികഠിനമായ ശ്വാസംമുട്ടൽ, സംസാരിക്കാൻ പറ്റായ്മ, ചുണ്ട് നീലിക്കൽ"
          },
          {
            id: "asthma_wheezing_flare",
            label: "Known asthma or bronchitis flareup with chest tightness and wheezing",
            urgency: "PRIORITY",
            manglish: "Asthma koodi, nenjil kooval/wheezing",
            malayalam: "ആസ്ത്മ വർദ്ധിച്ച് നെഞ്ചിൽ വലിവും ശ്വാസംമുട്ടലും"
          },
          {
            id: "exertional_gradual",
            label: "Short of breath only when climbing stairs or walking briskly",
            manglish: "Padi kayarumbol mathram shwasam muttal",
            malayalam: "പടികൾ കയറുമ്പോഴോ നടക്കുമ്പോഴോ മാത്രം ഉണ്ടാകുന്നത്"
          }
        ]
      }
    ]
  },
  palpitations: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "palpitation_symptoms",
        priority: 1,
        type: "single_select",
        question: "Is your heart racing very fast while at rest, with chest discomfort or dizziness?",
        manglish: "Chumma irikkumbol nenjidippu vegathil aavunno, koodathe thalakarakkamo vishamamo undo?",
        malayalam: "വെറുതെയിരിക്കുമ്പോൾ നെഞ്ചിടിപ്പ് വല്ലാതെ കൂടുന്നുണ്ടോ? തലകറക്കമോ നെഞ്ചിൽ വേദനയോ ഉണ്ടോ?",
        options: [
          {
            id: "palpitation_with_syncope",
            label: "Racing heart accompanied by chest pain, blackout, or shortness of breath",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Nenjidikkal, nenjuvedana, bodham poval",
            malayalam: "അമിത നെഞ്ചിടിപ്പ്, നെഞ്ചുവേദന, തലകറങ്ങി വീഴൽ"
          },
          {
            id: "flutter_skipped_beat",
            label: "Occasional missed or fluttering heartbeats without dizziness",
            manglish: "Idakkide nenjidichu ninnu pokunna pole",
            malayalam: "ഇടയ്ക്കിടെ നെഞ്ചിടിപ്പ് മാറിപ്പോകുന്നതുപോലെ തോന്നൽ"
          },
          {
            id: "stress_caffeine_racing",
            label: "Fast pulse related to anxiety, stress, or high coffee/tea intake",
            manglish: "Bhayamo kooduthal chaya kudichathino karanam",
            malayalam: "ടെൻഷൻ വരുമ്പോഴോ കാപ്പി കുടിക്കുമ്പോഴോ നെഞ്ചിടിപ്പ് കൂടുന്നത്"
          }
        ]
      }
    ]
  },
  chest_congestion: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "congestion_features",
        priority: 1,
        type: "single_select",
        question: "Is your chest congested with heavy phlegm, rattling sound, or fever?",
        manglish: "Nenjil kapham ketti kidakkunnundo, shwasathil shabdamo paniyo undo?",
        malayalam: "നെഞ്ചിൽ കഫം കെട്ടിക്കിടക്കുന്നുണ്ടോ? ശ്വാസത്തിൽ കുറുകുറുപ്പോ പനിയോ ഉണ്ടോ?",
        options: [
          {
            id: "severe_pneumonia_signs",
            label: "Heavy chest rattling with high fever, rapid breathing, and colored sputum",
            urgency: "PRIORITY",
            manglish: "Nenjil kapham, koodiya pani, shwasam edukal (Pneumonia)",
            malayalam: "നെഞ്ചിൽ കഫക്കെട്ട്, കടുത്ത പനി, കിതപ്പ് (ന്യുമോണിയ ലക്ഷണം)"
          },
          {
            id: "bronchial_cough_congestion",
            label: "Productive cough with yellow/green phlegm from viral bronchitis",
            manglish: "Kapham thuppi kalayunna chuma",
            malayalam: "കഫം വരുന്ന ചുമയും നെഞ്ചിൽ ഭാരവും"
          }
        ]
      }
    ]
  },
  blood_in_sputum: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "hemoptysis_severity",
        priority: 1,
        type: "single_select",
        question: "Are you coughing up bright red blood, clots, or just tiny specks in phlegm?",
        manglish: "Kaphathil chora varunnundo, kooduthal chora thuppukayano?",
        malayalam: "കഫത്തിൽ രക്തം കാണുന്നുണ്ടോ? ധാരാളമായി രക്തം ചുമച്ചു തുപ്പുകയാണോ?",
        options: [
          {
            id: "massive_coughing_blood",
            label: "Coughing up pure red blood or blood clots (Medical Emergency)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Nalla chora thuppunnu (Emergency)",
            malayalam: "രക്തം നേരിട്ട് ചുമച്ചു തുപ്പുന്നു (അടിയന്തിര സാഹചര്യം)"
          },
          {
            id: "streaks_in_phlegm",
            label: "Tiny red or brownish streaks in mucus during a harsh cough",
            urgency: "PRIORITY",
            manglish: "Kaphathinte koode cheruthayi chora niram",
            malayalam: "കഫത്തിൽ ചെറിയ തോതിൽ രക്തത്തിന്റെ അംശം"
          }
        ]
      }
    ]
  },
  painful_breathing: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "pleurisy_features",
        priority: 1,
        type: "single_select",
        question: "Is the chest pain sharp when inhaling deeply, and is there cough or recent flight/clot risk?",
        manglish: "Ullilekku shwasam edukkumbol kuthunna vedana aano, paniyo chuma undo?",
        malayalam: "ശ്വാസം ഉള്ളിലേക്ക് എടുക്കുമ്പോൾ നെഞ്ചിൽ കുത്തുന്ന വേദനയാണോ? പനിയോ ചുമയോ ഉണ്ടോ?",
        options: [
          {
            id: "pleuritic_pulmonary_embolism",
            label: "Sudden sharp breath pain with fast heart rate, coughing blood, or leg swelling (PE risk)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Pettannu kuthunna vedana, nenjidikkal, kaalil vekkam",
            malayalam: "പെട്ടെന്ന് ശ്വാസമെടുക്കുമ്പോൾ കുത്തുന്ന വേദന, കിതപ്പ്, കാലിൽ നീര്"
          },
          {
            id: "infection_pleuritis",
            label: "Sharp pain with fever and productive cough (Pleurisy / Pneumonia)",
            urgency: "PRIORITY",
            manglish: "Paniyum chumayum koode ulla kuthal vedana",
            malayalam: "പനിയും ചുമയോടുമൊപ്പം ശ്വാസമെടുക്കുമ്പോഴുള്ള വേദന"
          },
          {
            id: "musculoskeletal_rib_strain",
            label: "Pain worse with twisting or pressing directly on a tender rib",
            manglish: "Nenjinte ellil thottal vedana",
            malayalam: "നെഞ്ചിലെ വാരിയെല്ലിൽ തൊടുമ്പോൾ ഉണ്ടാകുന്ന വേദന"
          }
        ]
      }
    ]
  },

  // ═══ 6. GI (GASTROINTESTINAL) ═══
  abdominal_stomach_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "abdo_location_danger",
        priority: 1,
        type: "single_select",
        question: "Where is the pain located, and is the stomach rigid, board-like, or vomiting blood?",
        manglish: "Vayaru vedana evideyanu, vayaru kattiyayi kidakkunno, chardi undo?",
        malayalam: "വയറുവേദന എവിടെയാണ്? വയർ കല്ലുപോലെ കട്ടിയായിരിക്കുകയോ ഛർദ്ദിയോ ഉണ്ടോ?",
        options: [
          {
            id: "acute_abdomen_surgical",
            label: "Severe pain in lower right side (appendix), rigid belly, or severe vomiting",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Valathu adivayaril koodiya vedana (Appendicitis risk)",
            malayalam: "വലത് അടിവയറ്റിൽ കഠിനമായ വേദന, വയർ വലിഞ്ഞു മുറുകൽ (അപ്പെൻഡിസൈറ്റിസ് ലക്ഷണം)"
          },
          {
            id: "upper_stomach_burning_cramps",
            label: "Upper stomach burning pain related to food intake or acidity",
            manglish: "Melvayaril erichil, bhakshanam kazhikkumbol vedana",
            malayalam: "മേൽവയറ്റിൽ എരിച്ചിലും ഗ്യാസും"
          },
          {
            id: "colicky_gas_pain",
            label: "Generalized cramping and gas pain relieved by passing wind or stool",
            manglish: "Vayaru vimbitham, gas kettal",
            malayalam: "വയറു വേദനയും ഗ്യാസ് കെട്ടിനിൽക്കലും"
          }
        ]
      }
    ]
  },
  abdominal_cramps: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "cramp_pattern",
        priority: 1,
        type: "single_select",
        question: "Do the cramps come in waves with loose stools, or are they related to menstruation?",
        manglish: "Vayaru muriye pidikkunnathupole kuthunno, vayarippilakko periods samayathano?",
        malayalam: "വയർ തിരുമ്മിപ്പിടിക്കുന്നതുപോലെ വേദന വരുന്നുണ്ടോ? വയറിളക്കമോ ആർത്തവവുമായി ബന്ധപ്പെട്ടതോ ആണോ?",
        options: [
          {
            id: "cramps_with_diarrhea_fever",
            label: "Cramps accompanied by frequent watery diarrhea or fever (Gastroenteritis)",
            manglish: "Vayaru vedanayum loose motionum",
            malayalam: "വയറുവേദനയും കൂടെക്കൂടെയുള്ള വയറിളക്കവും"
          },
          {
            id: "menstrual_pelvic_cramps",
            label: "Lower abdominal / pelvic cramping during or before monthly periods",
            manglish: "Periods samayathe adivayaru vedana",
            malayalam: "ആർത്തവ സമയത്തെ അടിവയറ്റിലെ വേദന"
          },
          {
            id: "spasmodic_irritable_bowel",
            label: "Recurrent cramps with alternating constipation and diarrhea (IBS)",
            manglish: "Idakkide varunna vayaru vedanayum gasum",
            malayalam: "ഇടയ്ക്കിടെ വരുന്ന വയറുവേദനയും മലശോധനയിലെ മാറ്റങ്ങളും"
          }
        ]
      }
    ]
  },
  nausea_vomiting: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "vomiting_danger_signs",
        priority: 1,
        type: "single_select",
        question: "Are you unable to keep any liquids down, or is there blood or dark green bile?",
        manglish: "Vellam polum kudikkan pattathe chardikkunno, chardiyil chorayo pacha niramundo?",
        malayalam: "വെള്ളം പോലും കുടിക്കാൻ പറ്റാതെ ഛർദ്ദിക്കുന്നുണ്ടോ? ഛർദ്ദിയിൽ രക്തമോ പച്ചനിറമോ ഉണ്ടോ?",
        options: [
          {
            id: "vomiting_blood_coffee_ground",
            label: "Vomiting blood, coffee ground material, or extreme dehydration",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Chardiyil chora, koodiya ksheenam (Emergency)",
            malayalam: "ഛർദ്ദിയിൽ രക്തം അല്ലെങ്കിൽ അമിത ക്ഷീണവും നിർജ്ജലീകരണവും"
          },
          {
            id: "intractable_vomiting_unable_fluids",
            label: "Vomited multiple times, cannot keep even water down for > 12 hours",
            urgency: "PRIORITY",
            manglish: "Vellam kudichal udane chardikkunnu",
            malayalam: "വെള്ളം കുടിച്ചാൽ ഉടൻ ഛർദ്ദിച്ചു പോകുന്ന അവസ്ഥ"
          },
          {
            id: "mild_nausea_after_food",
            label: "Mild nausea and sour taste after meals or during travel",
            manglish: "Bhakshanam kazhicha sesham chardikkan varunnu",
            malayalam: "ഭക്ഷണശേഷമോ യാത്ര ചെയ്യുമ്പോഴോ ഉള്ള നേരിയ ഛർദ്ദി തോന്നൽ"
          }
        ]
      }
    ]
  },
  constipation: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "constipation_features",
        priority: 1,
        type: "single_select",
        question: "How many days without passing stool, and is your stomach severely distended or painful?",
        manglish: "Ethra divasamaayi malashodhana illathe, vayaru veethirikkunnundo, chardi undo?",
        malayalam: "എത്ര ദിവസമായി മലശോധനയില്ലാതെ? വയർ വല്ലാതെ വീർക്കുകയോ ഛർദ്ദിക്കുകയോ ചെയ്യുന്നുണ്ടോ?",
        options: [
          {
            id: "bowel_obstruction_vomiting",
            label: "No bowel motion or gas for > 3 days with severe pain, swelling, and vomiting",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Gas polum pokunnilla, koodiya vayaruvedana, chardi",
            malayalam: "മലമോ ഗ്യാസോ പോകുന്നില്ല, കഠിനമായ വയറുവേദനയും ഛർദ്ദിയും"
          },
          {
            id: "painful_hard_stools_piles",
            label: "Hard dry stools with straining and pain or bright blood on wiping (Piles/Fissure)",
            manglish: "Katti moolam vedana, chora thonnal (Piles/Fissure)",
            malayalam: "കഠിനമായ മലബന്ധം, മലം പോകുമ്പോൾ വേദനയും ചോരപ്പൊടിയും"
          },
          {
            id: "mild_infrequent_stool",
            label: "Infrequent hard stools for a few days due to travel or low fiber",
            manglish: "Randu divasathil orikkal mathram",
            malayalam: "ഭക്ഷണത്തിലെ മാറ്റങ്ങൾ കൊണ്ടുള്ള സാധാരണ മലബന്ധം"
          }
        ]
      }
    ]
  },
  heartburn_acidity: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "reflux_differentiation",
        priority: 1,
        type: "single_select",
        question: "Does the burning spread into your neck/mouth with sour taste, or feel like crushing chest pain?",
        manglish: "Nenjerichil thondakkottu kayari pulithikattal undo, atho nenjidippodu koodeyano?",
        malayalam: "നെഞ്ചെരിച്ചിൽ തൊണ്ടയിലേക്ക് കയറി പുളിച്ചുതികട്ടൽ വരുന്നുണ്ടോ? നെഞ്ചിൽ ഭാരവും വേദനയും ഉണ്ടോ?",
        options: [
          {
            id: "atypical_angina_concern",
            label: "Severe burning pressure with sweating, breathlessness, or radiating down left arm",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Nenjamathal, kayyilekku vedana, viyarppu (Heart risk)",
            malayalam: "നെഞ്ചിൽ കടുത്ത അമർത്തലും വിയർപ്പും ശ്വാസംമുട്ടലും (ഹൃദ്രോഗ സാധ്യത)"
          },
          {
            id: "gerd_acid_regurgitation",
            label: "Burning in chest/throat worse lying down, sour acid taste in mouth",
            manglish: "Pulithigattal, kidakkumbol nenjerichil koodunnu",
            malayalam: "കിടക്കുമ്പോൾ കൂടുന്ന നെഞ്ചെരിച്ചിലും വായിൽ പുളിരസവും"
          }
        ]
      }
    ]
  },
  bloating_indigestion: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "bloating_warning",
        priority: 1,
        type: "single_select",
        question: "Is the bloating constant and tight, or does it happen right after eating certain foods?",
        manglish: "Vayaru eppozhum vimbithamano, atho bhakshanam kazhikkumbol mathramano?",
        malayalam: "വയർ എപ്പോഴും വീർത്തു കെട്ടിനിൽക്കുകയാണോ അതോ ചില ഭക്ഷണങ്ങൾ കഴിക്കുമ്പോൾ മാത്രമാണോ?",
        options: [
          {
            id: "persistent_ascites_concern",
            label: "Rapidly enlarging abdomen, fluid sensation, leg swelling, or loss of weight",
            urgency: "PRIORITY",
            manglish: "Vayaru vellam ketti vekkuka, kaalil vekkam",
            malayalam: "വയറ്റിൽ വെള്ളം കെട്ടിനിൽക്കുന്നതുപോലെ പെട്ടെന്ന് വയർ കൂടൽ"
          },
          {
            id: "postprandial_gas",
            label: "Bloating and fullness after oily/heavy meals, frequent burping",
            manglish: "Bhakshanam kazhicha udane vayaru vimbuka, thikattal",
            malayalam: "ഭക്ഷണശേഷം വയറു വീർക്കലും ഗ്യാസും ഏമ്പക്കവും"
          }
        ]
      }
    ]
  },
  blood_in_stool: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "rectal_bleeding_type",
        priority: 1,
        type: "single_select",
        question: "Is the blood bright red drops in the toilet, mixed in stool, or black sticky tar?",
        manglish: "Chora chuvannu thulliyayi veezhunnathano, malathil kalarnnathano, atho karutha niramano?",
        malayalam: "രക്തം ചുവന്നു തുള്ളിയായി വീഴുന്നതാണോ, മലത്തിൽ കലർന്നതാണോ, അതോ കറുത്ത നിറത്തിലാണോ?",
        options: [
          {
            id: "heavy_clots_or_fainting",
            label: "Large amount of blood clots, dizziness, or weakness",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Dharalam chora, thalakarakkam, ksheenam",
            malayalam: "ധാരാളം രക്തം പോവുക, തലകറക്കവും ക്ഷീണവും"
          },
          {
            id: "black_tarry_stool",
            label: "Dark black, sticky, tar-like stool with foul smell (Melena - Stomach Bleed)",
            urgency: "EMERGENCY",
            manglish: "Karutha thaar pole malam (Melena)",
            malayalam: "കരിന്താർ പോലെ കറുത്ത ദുർഗന്ധമുള്ള മലം (ആമാശയത്തിലെ രക്തസ്രാവം)"
          },
          {
            id: "bright_red_drops_piles",
            label: "Bright red drops after passing stool with itching or pain (Piles/Fissure)",
            manglish: "Malam poyasesham chuvanna chora thullikal (Piles)",
            malayalam: "മലശോധനയ്ക്ക് ശേഷം തുള്ളിയായി ചുവന്ന രക്തം വീഴൽ (പൈൽസ്/ഫിഷർ)"
          }
        ]
      }
    ]
  },
  black_stool: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "melena_check",
        priority: 1,
        type: "single_select",
        question: "Is the stool jet-black and sticky like tar, or have you been taking iron tablets?",
        manglish: "Malam nalla karuppu niramano, iron maathirakal kazhikkunno, ksheenamundo?",
        malayalam: "മലം കരിന്താർ പോലെ കറുത്തതാണോ? അയൺ ഗുളികകൾ കഴിക്കാറുണ്ടോ? തലകറക്കമുണ്ടോ?",
        options: [
          {
            id: "true_melena_weakness",
            label: "Sticky black tarry stools with dizziness, nausea, or stomach ache (Internal Bleed)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Karutha malam, thalakarakkam, vayaruvedana (Emergency)",
            malayalam: "കറുത്ത മലം, തലകറക്കം, വയറുവേദന (ആന്തരിക രക്തസ്രാവം)"
          },
          {
            id: "iron_supplements_diet",
            label: "Dark greenish-black stool caused by iron syrup/tablets or specific foods",
            manglish: "Iron gulika kazhikkunnathu kondu vanna karuppu",
            malayalam: "അയൺ ഗുളിക കഴിക്കുന്നത് കൊണ്ടുണ്ടായ നിറവ്യത്യാസം"
          }
        ]
      }
    ]
  },
  vomiting_blood: {
    requiresSeverity: false,
    requiresDuration: false,
    questions: [
      {
        id: "hematemesis_urgent",
        priority: 1,
        type: "single_select",
        question: "Did you vomit bright red blood or dark coffee-ground material?",
        manglish: "Chardiyil chuvanna chorayo atho coffee podi pole karutho aano?",
        malayalam: "ഛർദ്ദിച്ചത് ചുവന്ന രക്തമാണോ അതോ കാപ്പിപ്പൊടി പോലുള്ള കറുത്ത നിറത്തിലാണോ?",
        options: [
          {
            id: "vomiting_blood_confirmed",
            label: "Yes — Vomiting blood or coffee-ground vomit (Immediate ER Care Required)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Athe — Chardiyil chora (Urgent hospital care)",
            malayalam: "അതെ — ഛർദ്ദിയിൽ രക്തം (ഉടൻ അടിയന്തിര ചികിത്സ തേടുക)"
          }
        ]
      }
    ]
  },

  // ═══ 7. URINARY ═══
  burning_urination: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "dysuria_features",
        priority: 1,
        type: "single_select",
        question: "Is there burning with fever/chills, severe lower back pain, or blood in urine?",
        manglish: "Muthram ozhikkumbol erichal, pani, iduppu vedanayo chorayo undo?",
        malayalam: "മൂത്രമൊഴിക്കുമ്പോൾ പുകച്ചിലോടൊപ്പം പനി, നടുവേദന, അല്ലെങ്കിൽ രക്തം കാണുന്നുണ്ടോ?",
        options: [
          {
            id: "uti_with_kidney_fever",
            label: "Burning urination accompanied by high fever, shaking chills, or flank pain",
            urgency: "PRIORITY",
            manglish: "Pukachil, virayalu ulla pani, nallavanathu iduppu vedana",
            malayalam: "മൂത്രത്തിൽ പുകച്ചിൽ, വിറയലോടെയുള്ള പനി, കഠിനമായ നടുവേദന"
          },
          {
            id: "uti_bladder_frequency",
            label: "Sharp burning with urge to pee every few minutes and lower pelvic ache",
            manglish: "Muthram ozhikkumbol koodiya erichil, adivayaru vedana",
            malayalam: "മൂത്രമൊഴിക്കുമ്പോൾ കഠിനമായ പുകച്ചിലും കൂടെക്കൂടെയുള്ള മുട്ടലും"
          }
        ]
      }
    ]
  },
  urinary_frequency: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "urinary_frequency_pattern",
        priority: 1,
        type: "single_select",
        question: "Do you wake up multiple times at night, and is there excessive thirst or fever?",
        manglish: "Rathriyil kooduthal thavana muthramozhikkan eneekkunnundo, daaham kooduthalano?",
        malayalam: "രാത്രിയിൽ പലതവണ മൂത്രമൊഴിക്കാൻ എഴുന്നേൽക്കാറുണ്ടോ? അമിത ദാഹമോ പനിയോ ഉണ്ടോ?",
        options: [
          {
            id: "diabetic_osmotic_frequency",
            label: "Excessive urination day and night with intense unquenchable thirst (Diabetes check)",
            urgency: "PRIORITY",
            manglish: "Dharalam muthram, koodiya daaham, ksheenam",
            malayalam: "ധാരാളം മൂത്രം പോവുക, അമിതമായ ദാഹം, ക്ഷീണം (പ്രമേഹ സാധ്യത)"
          },
          {
            id: "prostate_nocturia_men",
            label: "Frequent urination with weak slow stream and difficulty starting (Prostate in men)",
            manglish: "Muthram povan thaammasam, cheruthayi ozhukal",
            malayalam: "മൂത്രം പോകാൻ താമസം, ഒഴുക്ക് കുറവ് (പ്രോസ്റ്റേറ്റ് പ്രശ്നങ്ങൾ)"
          },
          {
            id: "mild_overactive_bladder",
            label: "Frequent urge to empty bladder without burning or pain",
            manglish: "Idakkide muthram muttunnu, vedanayilla",
            malayalam: "വേദനയില്ലാതെ ഇടയ്ക്കിടെ മൂത്രം ഒഴിക്കാൻ തോന്നുന്നത്"
          }
        ]
      }
    ]
  },
  urinary_urgency: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "urgency_leakage_screen",
        priority: 1,
        type: "single_select",
        question: "Is the urge so sudden that you cannot hold it and leakage occurs?",
        manglish: "Muthram muttiyal thadayan pattathe poyipokunno?",
        malayalam: "മൂത്രം പെട്ടെന്ന് വന്ന് നിയന്ത്രിക്കാൻ പറ്റാതെ പുറത്തുപോകുന്ന അവസ്ഥയുണ്ടോ?",
        options: [
          {
            id: "urgency_with_burning_uti",
            label: "Intense sudden urgency with burning and pelvic pain (Active infection)",
            manglish: "Muthram pidichu vekkan pattathilla, erichil",
            malayalam: "മൂത്രം പിടിച്ചുവെക്കാൻ പറ്റാത്ത അവസ്ഥയും പുകച്ചിലും"
          },
          {
            id: "overactive_bladder_urge",
            label: "Sudden strong urge requiring rushing to toilet, without pain",
            manglish: "Pettannu bathroomil odendi varunnu",
            malayalam: "പെട്ടെന്ന് ബാത്റൂമിലേക്ക് ഓടേണ്ടി വരുന്ന അവസ്ഥ"
          }
        ]
      }
    ]
  },
  difficulty_urinating: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "hesitancy_retention",
        priority: 1,
        type: "single_select",
        question: "Is there complete inability to pass urine with painful swelling, or just a weak stream?",
        manglish: "Muthram ottum povanilla, vayaru veethu vedana aano, atho cheruthayi ozhukano?",
        malayalam: "മൂത്രം ഒട്ടും പോകാതെ അടിവയർ വീർത്ത് കഠിനമായ വേദനയാണോ അതോ ഒഴുക്ക് കുറവാണോ?",
        options: [
          {
            id: "acute_urinary_retention",
            label: "Complete inability to urinate with painful swollen bladder (Immediate catheter needed)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Muthram ottum povanilla, adivayaru vimbitham (Emergency)",
            malayalam: "മൂത്രം ഒട്ടും പോകാതെ അടിവയർ വീർത്ത് വേദന (അടിയന്തിര ചികിത്സ)"
          },
          {
            id: "straining_weak_flow",
            label: "Takes minutes to start, weak interrupted trickling stream, sensation of incomplete emptying",
            manglish: "Muthram povan kooduthal samayam venam, ozhukku kuravu",
            malayalam: "മൂത്രം പോകാൻ കൂടുതൽ സമയം എടുക്കൽ, ഒഴുക്ക് കുറഞ്ഞ് തുള്ളിയായി പോവുക"
          }
        ]
      }
    ]
  },
  blood_in_urine: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "hematuria_features",
        priority: 1,
        type: "single_select",
        question: "Is the urine pink, red, or cola-colored, and is there severe pain or painless bleeding?",
        manglish: "Muthram chuvanna niramano, iduppu vedanayo atho vedanayillaathe chora pokunno?",
        malayalam: "മൂത്രത്തിന് ചുവപ്പോ തവിട്ടോ നിറമാണോ? കഠിനമായ വേദനയോ അതോ വേദനയില്ലാതെ രക്തം പോവുകയാണോ?",
        options: [
          {
            id: "painless_visible_hematuria",
            label: "Painless visible red blood in urine (Crucial urology screening for bladder/kidney)",
            urgency: "PRIORITY",
            manglish: "Vedanayillaathe muthrathil chora pokunnu",
            malayalam: "വേദനയില്ലാതെ മൂത്രത്തിൽ രക്തം പോകുന്നത് (യൂറോളജി പരിശോധന അത്യാവശ്യം)"
          },
          {
            id: "painful_hematuria_stone",
            label: "Red/pink urine with excruciating sharp flank/groin pain (Kidney Stone)",
            urgency: "PRIORITY",
            manglish: "Nalla iduppu vedana, muthrathil chora (Kidney stone)",
            malayalam: "കഠിനമായ നടുവേദനയോടൊപ്പം മൂത്രത്തിൽ രക്തം (മൂത്രക്കല്ല് സാധ്യത)"
          }
        ]
      }
    ]
  },
  flank_kidney_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "renal_colic_severity",
        priority: 1,
        type: "single_select",
        question: "Is the pain a severe sharp cramp on one side of lower back radiating to groin with vomiting?",
        manglish: "Oru bhagathe iduppil koodiya vedana adivayarilekku padarunno, chardi undo?",
        malayalam: "ഒരു വശത്തെ നടുവിൽ നിന്ന് അടിവയറ്റിലേക്ക് കുത്തിക്കയറുന്ന കഠിനമായ വേദനയാണോ? ഛർദ്ദിയുണ്ടോ?",
        options: [
          {
            id: "kidney_stone_colic",
            label: "Agonizing sharp flank pain coming in waves, unable to sit still, vomiting (Kidney stone)",
            urgency: "PRIORITY",
            manglish: "Sahikkan pattatha iduppu vedana, chardi (Kidney stone)",
            malayalam: "സഹിക്കാൻ പറ്റാത്ത നടുവേദന, ഛർദ്ദി (കിഡ്നി സ്റ്റോൺ ലക്ഷണം)"
          },
          {
            id: "pyelonephritis_kidney_infection",
            label: "Dull aching flank pain with high fever, chills, and cloudy urine (Kidney infection)",
            urgency: "PRIORITY",
            manglish: "Iduppu vedana, pani, virayal",
            malayalam: "നടുവേദന, പനി, വിറയൽ (വൃക്കയിലെ അണുബാധ)"
          }
        ]
      }
    ]
  },
  urinary_leakage: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "incontinence_trigger",
        priority: 1,
        type: "single_select",
        question: "Does urine leak when you cough, sneeze, or laugh, or do you leak before reaching toilet?",
        manglish: "Chumakkumbol muthram pokunno, atho bathroomil ethunnathinu munpe leak aavunno?",
        malayalam: "ചുമയ്ക്കുമ്പോഴോ ചിരിക്കുമ്പോഴോ മൂത്രം പോകുന്നുണ്ടോ? അതോ ബാത്റൂമിൽ എത്തുന്നതിന് മുൻപേ പോവുകയാണോ?",
        options: [
          {
            id: "stress_incontinence_cough",
            label: "Leaking small amounts during coughing, sneezing, laughing, or exercising",
            manglish: "Chumakkumbol muthram leak aavunnu",
            malayalam: "ചുമയ്ക്കുമ്പോഴോ ഭാരം ഉയർത്തുമ്പോഴോ അറിയാതെ മൂത്രം പോകുന്നത്"
          },
          {
            id: "urge_incontinence_rush",
            label: "Sudden overwhelming urge with leakage before reaching the toilet",
            manglish: "Muthram thadayan pattathe bathroom ethum munpe pokunnu",
            malayalam: "മൂത്രം പിടിച്ചുവെക്കാൻ പറ്റാതെ ബാത്റൂമിൽ എത്തും മുൻപേ പോകുന്നത്"
          }
        ]
      }
    ]
  },

  // ═══ 8. MUSCULOSKELETAL ═══
  neck_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "neck_pain_features",
        priority: 1,
        type: "single_select",
        question: "Does the pain shoot down into your arm with finger numbness, or is the neck stiff with fever?",
        manglish: "Kazhuthu vedana kayyilekku tharichu varunno, atho kazhuthu thirikkan pattatha paniyo undo?",
        malayalam: "കഴുത്തു വേദന കൈയിലേക്ക് പടർന്ന് മരവിപ്പ് വരുന്നുണ്ടോ? പനിയോ കഴുത്ത് അനക്കാൻ പറ്റാത്ത അവസ്ഥയോ ഉണ്ടോ?",
        options: [
          {
            id: "stiff_neck_fever_meningitis",
            label: "Rigid neck unable to touch chin to chest with high fever and confusion",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Kazhuthu anakkan pattilla, koodiya pani, thalavedana",
            malayalam: "കഴുത്ത് ഒട്ടും അനക്കാൻ പറ്റാത്ത അവസ്ഥ, കടുത്ത പനി (മെനിഞ്ചൈറ്റിസ് സാധ്യത)"
          },
          {
            id: "cervical_radiculopathy_nerve",
            label: "Sharp electric pain radiating from neck down arm with numbness or weak grip",
            urgency: "PRIORITY",
            manglish: "Kazhuthil ninnu kayyilekku minnal pole vedanayum tharippum",
            malayalam: "കഴുത്തിൽ നിന്ന് കൈയിലേക്ക് മിന്നൽ പോലെ പടരുന്ന വേദനയും മരവിപ്പും"
          },
          {
            id: "postural_muscle_strain",
            label: "Aching muscular stiffness from sleeping awkwardly or computer posture",
            manglish: "Kire naal computer upayogicho urangi eneettapo vanna vedana",
            malayalam: "കമ്പ്യൂട്ടർ ഉപയോഗം കൊണ്ടോ ഉറക്കത്തിലെ മാറ്റം കൊണ്ടോ ഉള്ള കഴുത്തുവേദന"
          }
        ]
      }
    ]
  },
  back_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "back_nerve_signs",
        priority: 1,
        type: "single_select",
        question: "Is there loss of bladder/bowel control, numbness in groin, or pain shooting down leg?",
        manglish: "Muthram pidichu vekkan pattathirikukayo, kaalilekku valichu vedana undo?",
        malayalam: "മലമൂത്ര നിയന്ത്രണം നഷ്ടപ്പെടുകയോ, അടിവയറ്റിൽ മരവിപ്പോ, കാലിലേക്ക് വലിച്ചുപിടിച്ചുള്ള വേദനയോ ഉണ്ടോ?",
        options: [
          {
            id: "cauda_equina_red_flag",
            label: "Loss of bladder control, groin/saddle numbness, or progressive leg weakness",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Muthram poyi pokunnu, kaalukal thalarunnu (Cauda Equina)",
            malayalam: "മൂത്ര നിയന്ത്രണം നഷ്ടപ്പെടൽ, കാലുകൾക്ക് ബലക്കുറവ് (അടിയന്തിര ശസ്ത്രക്രിയ ആവശ്യമായേക്കാം)"
          },
          {
            id: "sciatica_disc_herniation",
            label: "Shooting pain down back of thigh/calf with foot numbness (Sciatica/Slipped disc)",
            urgency: "PRIORITY",
            manglish: "Naduvedana kaalilekku valichu kayarunnu (Sciatica)",
            malayalam: "നടുവേദന കാലിലേക്ക് വലിച്ചു കയറുന്ന അവസ്ഥ (സയാറ്റിക്ക)"
          },
          {
            id: "lumbar_strain_muscle",
            label: "Aching localized lower back stiffness after heavy lifting or bending",
            manglish: "Bhaaram eduthappol vanna naduvedana",
            malayalam: "ഭാരം എടുത്തതുകൊണ്ടോ കുനിഞ്ഞതുകൊണ്ടോ ഉള്ള നടുവേദന"
          }
        ]
      }
    ]
  },
  muscle_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "myalgia_type",
        priority: 1,
        type: "single_select",
        question: "Is the pain all over your body with fever, or localized after heavy workout/injury?",
        manglish: "Shareeram muzhuvan paniyodu koode vedanayo, atho exercise/injury karanamano?",
        malayalam: "ശരീരം മുഴുവൻ പനിയോടുകൂടിയ വേദനയാണോ അതോ വ്യായാമമോ പരിക്കോ കാരണമോ?",
        options: [
          {
            id: "dark_urine_severe_pain",
            label: "Extreme muscle swelling and pain with cola-colored dark brown urine (Rhabdomyolysis)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Koodiya vedana, muthrathinu karutha/brown niram",
            malayalam: "കഠിനമായ പേശിവേദന, മൂത്രത്തിന് തവിട്ടുനിറം"
          },
          {
            id: "viral_fever_body_ache",
            label: "Widespread muscle aches across whole body associated with viral fever or dengue",
            manglish: "Paniyum shareeram chathachathu pole ulla vedanayum",
            malayalam: "പനിയും ശരീരം മുഴുവൻ ചതഞ്ഞതുപോലെയുള്ള വേദനയും"
          },
          {
            id: "isolated_workout_strain",
            label: "Soreness in specific muscle group 24-48 hours after exercise (DOMS/Strain)",
            manglish: "Exercise cheytha sesham vanna vedana",
            malayalam: "വ്യായാമത്തിന് ശേഷം ഉണ്ടാകുന്ന പേശിവേദന"
          }
        ]
      }
    ]
  },
  arm_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "arm_pain_cardiac_check",
        priority: 1,
        type: "single_select",
        question: "Is this left arm heaviness with chest pressure, or pain from a shoulder/muscle strain?",
        manglish: "Edathu kayyile bhaaravum nenjerichilum aano, atho kaiyyile pashikku koodiya vedanayo?",
        malayalam: "ഇടതുകൈയിലെ ഭാരവും നെഞ്ചുവേദനയും ആണോ അതോ പേശിവേദനയോ പരിക്കോ ആണോ?",
        options: [
          {
            id: "cardiac_arm_radiation",
            label: "Aching numbness in left arm accompanied by chest tightness or shortness of breath",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Edathu kai vedana nenjidippodu koode (Cardiac)",
            malayalam: "നെഞ്ചിൽ ഭാരത്തോടൊപ്പം ഇടതുകൈയിലേക്ക് പടരുന്ന വേദന (ഹൃദയാഘാത സാധ്യത)"
          },
          {
            id: "tennis_elbow_tendonitis",
            label: "Pain near elbow or forearm when gripping, lifting, or twisting wrist",
            manglish: "Kaiyyile ellil/elbowil vedana",
            malayalam: "മുട്ടിന്റെ ഭാഗത്തോ കൈത്തണ്ടയിലോ സാധനങ്ങൾ എടുക്കുമ്പോഴുള്ള വേദന"
          },
          {
            id: "bicep_shoulder_strain",
            label: "Ache in upper arm muscle after carrying heavy bags or lifting",
            manglish: "Bhaaram eduthappol kai vedanikkunnu",
            malayalam: "ഭാരം എടുത്തതുകൊണ്ടുള്ള കൈവേദന"
          }
        ]
      }
    ]
  },
  shoulder_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "shoulder_mobility",
        priority: 1,
        type: "single_select",
        question: "Can you raise your arm above your head, or is the shoulder joint completely stiff/frozen?",
        manglish: "Kayyu melekkuyarthan pattunnundo, atho tholazha anakkan pattatha reethiyil jam aayo?",
        malayalam: "കൈ മുകളിലേക്ക് ഉയർത്താൻ കഴിയുന്നുണ്ടോ? അതോ തോൾ അനക്കാൻ പറ്റാത്തവിധം മുറുകിപ്പോയോ?",
        options: [
          {
            id: "frozen_shoulder_adhesive",
            label: "Severe stiffness, cannot lift arm overhead or reach behind back (Frozen shoulder)",
            manglish: "Kayyu pokkan pattatha reethiyil thol vedana (Frozen shoulder)",
            malayalam: "കൈ മുകളിലേക്ക് ഉയർത്താനോ പുറകിലേക്ക് തിരിക്കാനോ പറ്റാത്ത തോൾവേദന"
          },
          {
            id: "rotator_cuff_tear_pain",
            label: "Sharp pain and weakness when raising arm sideways, pain sleeping on shoulder",
            manglish: "Kidakkumbol thol vedana, kayyinu balamilla",
            malayalam: "തോൾ ചരിഞ്ഞു കിടക്കുമ്പോൾ വേദന, കൈ ഉയർത്തുമ്പോൾ ബലക്കുറവ്"
          }
        ]
      }
    ]
  },
  knee_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "knee_mechanical_signs",
        priority: 1,
        type: "single_select",
        question: "Does the knee click, lock, or give way, and is there swelling or difficulty bearing weight?",
        manglish: "Muttil vekkamundo, nadakkumbol chanthathupole aavunno, muttu madakkan pattunno?",
        malayalam: "മുട്ടിൽ നീരുണ്ടോ? നടക്കുമ്പോൾ കാൽ കുത്താൻ കഴിയുന്നുണ്ടോ? മുട്ട് മടക്കാൻ ബുദ്ധിമുട്ടുണ്ടോ?",
        options: [
          {
            id: "inability_weight_bearing_ligament",
            label: "Knee popped during twist/sports, severe swelling within hours, unable to step on foot",
            urgency: "PRIORITY",
            manglish: "Muttu thirinjappol pottiya pole, kaal kuthan pattilla (Ligament tear)",
            malayalam: "മുട്ട് തിരിഞ്ഞ് പരിക്കേറ്റു, കാൽ നിലത്തു കുത്താൻ പറ്റാത്തവിധം നീര്"
          },
          {
            id: "osteoarthritis_crepitus",
            label: "Knee pain worse going down stairs, grating crackling sound, morning stiffness",
            manglish: "Padi irangumbol vedana, muttinte theymanam",
            malayalam: "പടികൾ ഇറങ്ങുമ്പോൾ കഠിനമായ വേദന, മുട്ടിന്റെ തേയ്മാനം"
          }
        ]
      }
    ]
  },
  foot_ankle_pain: {
    requiresSeverity: true,
    requiresDuration: true,
    questions: [
      {
        id: "foot_pain_site",
        priority: 1,
        type: "single_select",
        question: "Is there pain on the first steps out of bed in the heel, or a twisted swollen ankle?",
        manglish: "Ravile eneettu nadakkumbol kannankalil kuthunna vedanayo, atho kaal thettiyathano?",
        malayalam: "രാവിലെ എഴുന്നേറ്റ് ആദ്യ ചുവടുകൾ വെക്കുമ്പോൾ ഉപ്പൂറ്റിയിൽ കുത്തുന്ന വേദനയോ, അതോ കാൽ ഉളുക്കിയതാണോ?",
        options: [
          {
            id: "acute_sprain_fracture",
            label: "Ankle twisted, rapidly swollen, bruised, cannot walk 4 steps",
            urgency: "PRIORITY",
            manglish: "Kaal thetti veengi, nadakkan pattilla (Sprain/Fracture)",
            malayalam: "കാൽ ഉളുക്കി നീരുവന്നു, നടക്കാൻ പറ്റാത്ത അവസ്ഥ"
          },
          {
            id: "plantar_fasciitis_heel",
            label: "Sharp stabbing heel pain during first few steps in the morning (Plantar fasciitis)",
            manglish: "Ravile kaal nilathu thodumbol uppooti vedana",
            malayalam: "രാവിലെ നിലത്തു കാൽ കുത്തുമ്പോൾ ഉപ്പൂറ്റിയിൽ കുത്തുന്ന വേദന"
          },
          {
            id: "gout_big_toe_red",
            label: "Big toe joint suddenly red, hot, swollen, and excruciatingly tender (Gout)",
            urgency: "PRIORITY",
            manglish: "Kaal viralil nalla chuvappum vekkavum vedanayum (Gout)",
            malayalam: "കാൽവിരലിൽ പെട്ടെന്ന് അതികഠിനമായ ചുവപ്പും ചൂടും വേദനയും (യൂറിക് ആസിഡ്/ഗൗട്ട്)"
          }
        ]
      }
    ]
  },
  trauma_fracture: {
    requiresSeverity: true,
    requiresDuration: false,
    questions: [
      {
        id: "fracture_deformity",
        priority: 1,
        type: "single_select",
        question: "Is the bone visibly bent, bone piercing the skin, or severe numbness below the injury?",
        manglish: "Ellu odinjo konatayo, chora varunno, kayyilo kaalilo thalarcha undo?",
        malayalam: "എല്ല് ഒടിഞ്ഞു വളഞ്ഞതായോ, തൊലി തുളച്ച് പുറത്തു വന്നതായോ കാണുന്നുണ്ടോ?",
        options: [
          {
            id: "open_fracture_deformity",
            label: "Visible limb deformity, bone piercing skin, or severe acute accident (ER Emergency)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Ellu odinju, thadipum chorayum (Emergency Ortho)",
            malayalam: "എല്ല് ഒടിഞ്ഞു വളഞ്ഞു, രക്തസ്രാവം (അടിയന്തിര എമർജൻസി പരിചരണം)"
          },
          {
            id: "closed_painful_fall",
            label: "Direct fall with localized bone tenderness and swelling, but skin closed",
            urgency: "PRIORITY",
            manglish: "Veenu, ellil thottal koodiya vedana (X-ray needed)",
            malayalam: "താഴെ വീണതു കാരണം എല്ലിന്മേൽ കഠിനമായ വേദനയും നീരും"
          }
        ]
      }
    ]
  },
  swelling: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "swelling_location_scope",
        priority: 1,
        type: "single_select",
        question: "Is the swelling in one leg only with pain/redness, or in both legs, or facial/lip swelling?",
        manglish: "Vekkam oru kaalil mathram chuvappode aano, randu kaalilumo, atho mughathum chundilumo?",
        malayalam: "നീർക്കെട്ട് ഒരു കാലിൽ മാത്രമായി ചുവപ്പോടെയാണോ, രണ്ട് കാലിലുമോ, അതോ മുഖത്തോ ചുണ്ടിലോ ആണോ?",
        options: [
          {
            id: "anaphylaxis_lip_face",
            label: "Swelling of lips, tongue, or face with throat tightness or hives (Allergic Emergency)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Chundum mughavum veengi, shwasam muttal (Allergy Emergency)",
            malayalam: "ചുണ്ടിലും മുഖത്തും നീര്, ശ്വാസതടസ്സം (ഗുരുതരമായ അലർജി അവസ്ഥ)"
          },
          {
            id: "unilateral_leg_dvt",
            label: "One calf/leg suddenly warm, swollen, red, and painful (Deep Vein Thrombosis risk)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Oru kaalil mathram koodiya vekkavum chuvappum (DVT)",
            malayalam: "ഒരു കാലിൽ മാത്രം പെട്ടെന്നുണ്ടായ കടുത്ത നീരും ചുവപ്പും ചൂടും"
          },
          {
            id: "bilateral_ankle_edema",
            label: "Both feet and ankles swollen by evening, indenting when pressed",
            manglish: "Randu kaalilum viralkondu amarthiyal kuzhi veezhunna vekkam",
            malayalam: "രണ്ട് കാലിലും വിരലമർത്തുമ്പോൾ കുഴിയുന്ന വിധത്തിലുള്ള നീര്"
          }
        ]
      }
    ]
  },

  // ═══ 9. SKIN ═══
  itching: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "pruritus_features",
        priority: 1,
        type: "single_select",
        question: "Is the itching all over the body, worse at night between fingers, or accompanied by yellow eyes?",
        manglish: "Chorichil shareeram muzhuvanundo, rathri koodunno, kannil manja niramundo?",
        malayalam: "ചൊറിച്ചിൽ ശരീരം മുഴുവനുമുണ്ടോ? രാത്രിയിൽ വിരലുകൾക്കിടയിൽ കൂടുന്നുണ്ടോ? കണ്ണിൽ മഞ്ഞനിറമുണ്ടോ?",
        options: [
          {
            id: "cholestatic_jaundice_itch",
            label: "Intense full-body itching accompanied by yellowing eyes and dark urine",
            urgency: "PRIORITY",
            manglish: "Shareeram muzhuvan chorichil, kannil manja niram (Liver issue)",
            malayalam: "ശരീരം മുഴുവൻ കഠിനമായ ചൊറിച്ചിലും കണ്ണിൽ മഞ്ഞനിറവും (കരൾ സംബന്ധം)"
          },
          {
            id: "scabies_nocturnal_itch",
            label: "Severe itching mainly at night, web spaces of fingers, family members also itching",
            manglish: "Rathri koodunna chorichil, viralukalkkidayil (Scabies)",
            malayalam: "രാത്രിയിൽ കൂടുന്ന ചൊറിച്ചിൽ, വിരലുകൾക്കിടയിലെ തടിപ്പുകൾ"
          },
          {
            id: "dry_skin_eczema",
            label: "Dry, flaky, itchy patches in elbow creases, knees, or neck",
            manglish: "Varanda tholi, chorichil (Eczema)",
            malayalam: "വരണ്ട ചർമ്മവും ചൊറിച്ചിലും"
          }
        ]
      }
    ]
  },
  hair_loss: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "alopecia_pattern",
        priority: 1,
        type: "single_select",
        question: "Is hair falling out in round coin-shaped bald patches, or overall gradual thinning?",
        manglish: "Mudi vattathil poyathu poleyano, atho thalayil muzhuvanayi poyathano?",
        malayalam: "മുടി വട്ടത്തിൽ കൊഴിഞ്ഞുപോയതാണോ അതോ തലയിൽ ക്രമേണയുള്ള കട്ടി കുറയലാണോ?",
        options: [
          {
            id: "alopecia_areata_coin",
            label: "Smooth round coin-sized bald spots on scalp or beard (Alopecia Areata)",
            manglish: "Thalayil vattathil mudi poyi (Alopecia)",
            malayalam: "നാണയ വലിപ്പത്തിൽ വട്ടത്തിൽ മുടി കൊഴിഞ്ഞുപോയ പാടുകൾ"
          },
          {
            id: "diffuse_telogen_effluvium",
            label: "Excessive handfuls of hair shedding after fever, illness, stress, or delivery",
            manglish: "Kure mudi kayyil varunnu, pani/stressinu sesham",
            malayalam: "പനിയ്ക്കോ പ്രസവത്തിനോ ശേഷം മുടി ധാരാളമായി കൊഴിഞ്ഞുപോകുന്നത്"
          },
          {
            id: "androgenetic_pattern_thinning",
            label: "Gradual hairline receding at temples or thinning at crown over years",
            manglish: "Munbhagathe mudi kuranju kayarunnu",
            malayalam: "തലയുടെ മുൻഭാഗത്തോ നെറുകയിലോ മുടി പതുക്കെ കൊഴിയുന്നത്"
          }
        ]
      }
    ]
  },
  excessive_sweating: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "hyperhidrosis_location",
        priority: 1,
        type: "single_select",
        question: "Do your palms and soles sweat constantly, or is it whole-body sweating with racing pulse?",
        manglish: "Kayyo kaalo eppozhum viyarppano, atho shareeram muzhuvan nenjidippodu koodeyano?",
        malayalam: "കൈപ്പത്തിയിലും കാലുകളിലും എപ്പോഴും വിയർപ്പാണോ അതോ നെഞ്ചിടിപ്പോടെ ശരീരം മുഴുവൻ വിയർക്കുന്നതാണോ?",
        options: [
          {
            id: "palmar_plantar_hyperhidrosis",
            label: "Dripping sweat on palms and soles since childhood/youth, affecting writing",
            manglish: "Kayyil eppozhum vellam pole viyarppu",
            malayalam: "കൈകാലുകളിൽ എപ്പോഴും വിയർത്തു നനഞ്ഞിരിക്കുന്ന അവസ്ഥ"
          },
          {
            id: "endocrine_thyroid_sweating",
            label: "Generalized sweating, heat intolerance, weight loss, and shaky hands",
            manglish: "Choodu thaangan pattilla, shareeram viyarunnu, thalakarakkam",
            malayalam: "ചൂട് സഹിക്കാൻ പറ്റായ്മ, ശരീരം മുഴുവൻ വിയർക്കലും വിറയലും"
          }
        ]
      }
    ]
  },

  // ═══ 10. REPRODUCTIVE & WOMEN'S HEALTH ═══
  unexpected_vaginal_bleeding: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "bleeding_context",
        priority: 1,
        type: "single_select",
        question: "Is bleeding occurring during pregnancy, after menopause, or soaking pads rapidly?",
        manglish: "Garbhini aayirikkumbolano, menopause kazhinjo, atho nalla bleeding undo?",
        malayalam: "ഗർഭകാലത്താണോ രക്തസ്രാവം, ആർത്തവവിരാമത്തിന് ശേഷമാണോ, അതോ അമിതമായ രക്തസ്രാവമാണോ?",
        options: [
          {
            id: "pregnancy_bleeding_emergency",
            label: "Bleeding during confirmed or suspected pregnancy, especially with pain",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Garbhini aayirikke chora pokunnu, vedana (Emergency)",
            malayalam: "ഗർഭകാലത്തുണ്ടാകുന്ന രക്തസ്രാവവും കഠിനമായ വേദനയും"
          },
          {
            id: "post_menopausal_bleeding",
            label: "Any vaginal bleeding occurring years after menopause has stopped",
            urgency: "PRIORITY",
            manglish: "Menopause kazhinju varsham kazhinjittum chora varunnu",
            malayalam: "ആർത്തവവിരാമം കഴിഞ്ഞ് നാളുകൾക്ക് ശേഷമുണ്ടാകുന്ന രക്തസ്രാവം"
          },
          {
            id: "irregular_spotting_between_periods",
            label: "Light spotting between regular menstrual cycles or after intercourse",
            manglish: "Periods idakku cheruthayi chora kanunnu",
            malayalam: "ആർത്തവങ്ങൾക്കിടയിൽ കാണുന്ന ചെറിയ തോതിലുള്ള രക്തം"
          }
        ]
      }
    ]
  },
  pregnancy_pelvic_pain: {
    requiresSeverity: true,
    requiresDuration: false,
    questions: [
      {
        id: "pregnancy_pain_danger",
        priority: 1,
        type: "single_select",
        question: "Are you pregnant with sharp one-sided pelvic pain, shoulder pain, or feeling faint?",
        manglish: "Garbhini aano, adivayaril koodiya vedanayo, mayakkamo, chora pokalo undo?",
        malayalam: "ഗർഭാവസ്ഥയിൽ അടിവയറ്റിൽ കഠിനമായ വേദനയോ, രക്തസ്രാവമോ, തലകറങ്ങി വീഴലോ ഉണ്ടോ?",
        options: [
          {
            id: "ectopic_miscarriage_emergency",
            label: "Sharp pelvic cramping, spotting, dizziness, or shoulder-tip pain (Ectopic warning)",
            redFlag: true,
            urgency: "EMERGENCY",
            manglish: "Koodiya adivayaru vedana, chora varal, thalakarakkam (Ectopic risk)",
            malayalam: "കഠിനമായ വയറുവേദന, രക്തസ്രാവം, തലകറക്കം (എക്ടോപിക് ഗർഭധാരണ സാധ്യത)"
          },
          {
            id: "round_ligament_mild",
            label: "Mild stretching jabbing ache in groin when turning in bed or standing quickly",
            manglish: "Cheriya valivu vedana, kidannu thiriyumbol",
            malayalam: "ഗർഭപാത്രം വലിയുമ്പോഴുണ്ടാകുന്ന സാധാരണ നേരിയ വേദന"
          }
        ]
      }
    ]
  },
  breast_lumps: {
    requiresSeverity: false,
    requiresDuration: true,
    questions: [
      {
        id: "breast_lump_features",
        priority: 1,
        type: "single_select",
        question: "Is the lump firm and painless, or is there nipple discharge, skin dimpling, or redness?",
        manglish: "Maridathil kattiyulla muzha undo, nipple-il ninnu neer/chora varunno, tholi churunganundo?",
        malayalam: "സ്തനത്തിൽ കട്ടിയുള്ള മുഴയുണ്ടോ? മുലക്കണ്ണിൽ നിന്ന് രക്തമോ ദ്രാവകമോ വരികയോ ചർമ്മം ചുളിയുകയോ ഉണ്ടോ?",
        options: [
          {
            id: "firm_painless_lump_dimpling",
            label: "Firm painless lump, skin puckering/dimpling, or blood-stained nipple discharge",
            urgency: "PRIORITY",
            manglish: "Vedanayillaatha muzha, tholi churungal, chora varal",
            malayalam: "വേദനയില്ലാത്ത കട്ടിയുള്ള മുഴ, തൊലിയിൽ കുഴിവുകൾ, രക്തം കലർന്ന സ്രവം"
          },
          {
            id: "painful_cyclic_nodules",
            label: "Tender swollen lumps in both breasts that increase right before periods",
            manglish: "Periods varunnathinu munpe maridathil vedanayum vekkavum",
            malayalam: "ആർത്തവത്തിന് മുൻപ് സ്തനങ്ങളിൽ ഉണ്ടാകുന്ന വേദനയും വീക്കവും"
          },
          {
            id: "lactation_mastitis_fever",
            label: "Red, hot, tender breast lump during breastfeeding with fever (Mastitis/Abscess)",
            urgency: "PRIORITY",
            manglish: "Mulayootunna samayathe chuvappum choodum vedanayum (Mastitis)",
            malayalam: "മുലയൂട്ടുന്ന അമ്മമാർക്ക് ഉണ്ടാകുന്ന കഠിനമായ വേദനയും ചുവപ്പും പനിയും"
          }
        ]
      }
    ]
  }
};

// Merge into data.followUpProfiles
if (!data.followUpProfiles) {
  data.followUpProfiles = {};
}

let count = 0;
for (const [key, profile] of Object.entries(profiles)) {
  data.followUpProfiles[key] = profile;
  count++;
}

fs.writeFileSync(mapPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`✅ Successfully updated departmentMap.json with ${count} comprehensive follow-up profiles!`);
