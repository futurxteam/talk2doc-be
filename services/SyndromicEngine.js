// services/SyndromicEngine.js

import Syndrome from "../models/Syndrome.js";
import Disease from "../models/Disease.js";

const norm = (s) => {
  if (!s) return s;
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")         // spaces → underscores
    .replace(/[^a-z0-9_]/g, "_")  // replace special chars
    .replace(/_+/g, "_")          // collapse repeated underscores
    .replace(/^_+|_+$/g, "");     // trim leading/trailing underscores
};



function normalizeBodyPart(raw) {
  if (!raw) return raw;
  return norm(raw);  // simple snake_case now
}


export default class SyndromicEngine {
  constructor(input = {}) {
    this.chiefComplaints = (input.chiefComplaints || []).map(norm);
    this.bodyParts = (input.bodyParts || []).map(normalizeBodyPart);
    this.age = input.age ?? null;
    this.sex = input.sex ? norm(input.sex) : null;
    this.habits = new Set((input.habits || []).map(norm));
      this.clinicalFeatures = new Set();   // ✅ ADD THIS
    this.activeSyndromes = new Set();
    this.syndromePerComplaint = new Map(); // cc → ARRAY of syndromes
    this.answers = {};
    this.selectedSymptoms = new Set();
    this.rejectedSymptoms = new Set();
    this.riskFactors = {};
    this.importantSymptoms = new Set();

    this.modifiers = {};
    this.asked = new Set();
    this.redFlagTriggered = false;
    this.emergencyReason = null;
    this.redFlagAlerts = [];
    this.rejectedRoots = new Set(); 
    this.answerHistory = []; 
// [{ questionId, prevStateSnapshot }]

this.skippedQuestions = new Set(); // for "don't know"

    this.diseases = [];
    this.diseasesLoaded = false;
    this.syndromes = [];
    this.syndromesLoaded = false;
  }

  // Fix: Convert MongoDB plain object → real Map
  _toMap(obj) {
    if (!obj) return new Map();
    if (obj instanceof Map) return obj;
    try {
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  static async create(input) {
    const engine = new SyndromicEngine(input);
    await engine.loadSyndromes();
    await engine.loadDiseases();
    await engine.detectSyndromes();
    engine.preMapHabits();
    return engine;
  }
_findRootForQuestion(doc, questionId) {
  if (!questionId) return null;

  const rootMap = this._toMap(doc.root_questions);

  // 1️⃣ Direct root
  for (const [rootKey, roots] of rootMap.entries()) {
    if (roots.some(q => q.id === questionId)) {
      return rootKey;
    }
  }

  // 2️⃣ Walk dependency chain
  const allQuestions = [
    ...Object.values(Object.fromEntries(rootMap)).flat(),
    ...(doc.question_tree || [])
  ];

  const q = allQuestions.find(x => x.id === questionId);
if (Array.isArray(q?.depends_on)) {
  return this._findRootForQuestion(
    doc,
    q.depends_on[0]?.question_id
  );
}

if (q?.depends_on?.question_id) {
  return this._findRootForQuestion(doc, q.depends_on.question_id);
}


  return null;
}


  async loadDiseases() {
    if (this.diseasesLoaded) return;
    this.diseases = await Disease.find({}).lean();
    this.diseasesLoaded = true;
  }

  async loadSyndromes() {
    if (this.syndromesLoaded) return;
    this.syndromes = await Syndrome.find({ is_active: true }).lean();
    this.syndromesLoaded = true;
  }

  preMapHabits() {
    for (const h of this.habits) {
const key = norm(h);
      const isRisk = this.diseases.some(d =>
        Object.keys(d.risk_factors || {}).map(norm).includes(key)
      );
      const isSymptom = this.diseases.some(d =>
  [
    ...(d.symptoms || []),
    ...(d.clinical_features || []),
    ...(d.important_symptoms || [])
  ].map(norm).includes(key)
);

      if (isRisk) this.riskFactors[key] = "yes";
      if (isSymptom) this.selectedSymptoms.add(key);
    }
  }

  async detectSyndromes() {
    if (!this.syndromesLoaded) await this.loadSyndromes();

    const candidates = [];

    for (const synd of this.syndromes) {
      for (const t of synd.triggers?.entries || []) {
       const cc = norm(t.chief_complaint);
const bp = t.body_part ? norm(t.body_part) : null;

        for (let i = 0; i < this.chiefComplaints.length; i++) {
          const userCC = norm(this.chiefComplaints[i]);
          const userBP = this.bodyParts[i] ? norm(this.bodyParts[i]) : null;

          if (userCC === cc && (!bp || userBP === bp)) {
            candidates.push({
              syndrome: synd.name,
              cc: userCC,
              priority: t.priority || 999,
              doc: synd,
            });
          }
        }
      }
    }

    // Allow multiple syndromes (e.g., TB from cough + fever)
    const used = new Set();
    for (const c of candidates.sort((a, b) => a.priority - b.priority)) {
     this.activeSyndromes.add(c.syndrome);

if (!this.syndromePerComplaint.has(c.cc)) {
  this.syndromePerComplaint.set(c.cc, []);
}
this.syndromePerComplaint.get(c.cc).push(c.doc);

    }
  }

  async findNextQuestion() {

    if (!this.syndromesLoaded) await this.loadSyndromes();
const activeDocs = [...this.syndromePerComplaint.values()].flat();

       // SMART EARLY STOP + HARD LIMIT (BEST OF BOTH WORLDS)
const totalAsked =  this.asked.size - this.skippedQuestions.size;

    // 1. HARD LIMIT: Never ask more than 20 questions
    if (totalAsked >= 50) {
      return null; // done
    }

    // 2. EARLY STOP: If confidence already ≥ 94% after 5+ questions → stop
    if (totalAsked >= 40) {
      const temp = await this.getFinalDiagnosis();
      const topScore = temp.results[0]?.score || 0;

      // Stop early if we're already extremely confident
      if (topScore >= 0.94) {
        return null;
      }

      // Or if top 2 diseases cover 97% of probability
      const topTwoTotal = temp.results
        .slice(0, 2)
        .reduce((sum, d) => sum + d.score, 0);

      if (topTwoTotal >= 0.97) {
        return null;
      }
    }// ✅ ASK ALL ROOT QUESTIONS OF ALL ACTIVE SYNDROMES (IMPROVED)
const seenRootIds = new Set(); // Prevent duplicates across syndromes

// Use unique syndrome documents to avoid processing the same syndrome multiple times
const uniqueActiveDocs = [...new Map(
  [...this.syndromePerComplaint.values()].flat()
    .map(doc => [doc._id?.toString() || doc.name, doc])
).values()];

for (const syndDoc of uniqueActiveDocs) {
  const rootMap = this._toMap(syndDoc.root_questions);
  for (const [rootKey, roots] of rootMap.entries()) {
    // Skip entire root branch if rejected (e.g., answered "no" before)
    if (this.rejectedRoots.has(`${syndDoc.name}:${rootKey}`)) continue;

    for (const q of roots.sort((a, b) => (a.rank || 99) - (b.rank || 99))) {
      // Skip if already answered (yes/no/dont_know)
      if (this.asked.has(q.id)) continue;
      if (this.skippedQuestions.has(q.id)) continue;

      // Critical: Prevent same root question from being returned multiple times
      // (common when shared across syndromes)
      if (seenRootIds.has(q.id)) continue;

      seenRootIds.add(q.id);

      return {
        ...q,
        is_root: true,
        root_key: rootKey,
        syndrome: syndDoc.name,
        options: q.options || []
      };
    }
  }
}

    // 2. MAIN QUESTION TREE + BRANCHING
    for (const syndDoc of activeDocs) {
      // Regular questions
      for (const q of syndDoc.question_tree || []) {
  const rootKey = q.root_key || q.depends_on?.question_id
    ? this._findRootForQuestion(syndDoc, q.depends_on?.question_id)
    : null;

  // 🔴 HARD SKIP: rejected root branch
if (
  rootKey &&
  this.rejectedRoots.has(`${syndDoc.name}:${rootKey}`)
) {
  continue;
}

  if (this.asked.has(q.id)) continue;
  if (q.depends_on && !this._dependencyMet(q.depends_on)) continue;

 
  return { ...q, root_key: rootKey, options: q.options || [] };
}


      // Branching
      for (const rule of syndDoc.branching_rules || []) {
        if (!this._dependencyMet(rule.depends_on)) continue;
        for (const nextId of rule.then_ask || []) {
          if (this.asked.has(nextId)) continue;
          const q = this._findQuestionInDoc(syndDoc, nextId);
          if (q) {
           
            return { ...q, options: q.options || [] };
          }
        }
      }
    }

   // If no questions left in active syndromes,
// but other syndromes exist for same CC → re-evaluate
if (this.activeSyndromes.size > 0) {
  return null;
}

// Otherwise interview truly ends
return null;

  }

async findNextQuestions(batchSize = 5) {
      const MAX_ROOT = 2;

  const questions = [];
  const activeDocs = [...this.syndromePerComplaint.values()].flat();

  const canAskGeneral = (q) => {
  if (this.asked.has(q.id)) return false;
  if (this.skippedQuestions.has(q.id)) return false;
  return !q.depends_on;
};

const canAskDependent = (q) => {
  if (this.asked.has(q.id)) return false;
  if (this.skippedQuestions.has(q.id)) return false;
  if (!q.depends_on) return false;

  const ans = this.answers[q.depends_on.question_id];
  if (!ans) return false;

  const req = (q.depends_on.required_value || []).map(norm);
  return req.includes(norm(ans));
};

  let rootCount = 0;
const seenRootIds = new Set();
// 1️⃣ ROOT QUESTIONS FIRST (LIMITED)
for (const doc of activeDocs) {
  const rootMap = this._toMap(doc.root_questions);

  for (const [rootKey, roots] of rootMap.entries()) {
    if (this.rejectedRoots.has(`${doc.name}:${rootKey}`)) continue;

   for (const q of roots.sort((a, b) => (a.rank || 99) - (b.rank || 99))) {
      // ✅ CRITICAL FIXES:
      if (this.asked.has(q.id)) continue;           // Already answered
      if (this.skippedQuestions.has(q.id)) continue; // "Don't know"
      if (seenRootIds.has(q.id)) continue;          // Already queued from another syndrome
      if (questions.some(x => x.id === q.id)) continue; // Already in batch

      if (questions.length >= batchSize) return questions;
      if (rootCount >= MAX_ROOT) break;
      questions.push({
        ...q,
        is_root: true,
        root_key: rootKey,
        syndrome: doc.name,
        options: q.options || []
      });

      rootCount++;
    }
  }
}



 // 2️⃣ GENERAL QUESTIONS
for (const doc of activeDocs) {
  for (const q of doc.question_tree || []) {
    if (questions.length >= batchSize) return questions;
    if (canAskGeneral(q)) questions.push(q);
  }
}

// 3️⃣ DEPENDENT QUESTIONS
for (const doc of activeDocs) {
  for (const q of doc.question_tree || []) {
    if (questions.length >= batchSize) return questions;
    if (canAskDependent(q)) questions.push(q);
  }
}


  return questions;
}



  _findQuestionInDoc(doc, id) {
  const rootMap = this._toMap(doc.root_questions);

  for (const [rootKey, questions] of rootMap.entries()) {
    for (const q of questions) {
      if (q.id === id) return { ...q, root_key: rootKey };
    }
  }

  for (const q of doc.question_tree || []) {
    return q.id === id ? q : null;
  }

  return null;
}



_snapshotState() {
  return {
    answers: { ...this.answers },
    selectedSymptoms: new Set(this.selectedSymptoms),
    clinicalFeatures: new Set(this.clinicalFeatures),
    importantSymptoms: new Set(this.importantSymptoms),
    riskFactors: { ...this.riskFactors },
    rejectedSymptoms: new Set(this.rejectedSymptoms),
    rejectedRoots: new Set(this.rejectedRoots),
    asked: new Set(this.asked),
    skippedQuestions: new Set(this.skippedQuestions),
    redFlagTriggered: this.redFlagTriggered,
    emergencyReason: this.emergencyReason,
    redFlagAlerts: [...this.redFlagAlerts]
  };
}



_dependencyMet(dep) {
  if (!dep) return true;

  // 🔹 OR logic
  if (dep.any && Array.isArray(dep.any)) {
    return dep.any.some(d => this._dependencyMet(d));
  }

  // 🔹 AND logic (explicit)
  if (dep.all && Array.isArray(dep.all)) {
    return dep.all.every(d => this._dependencyMet(d));
  }

  // 🔹 Backward compatibility: array = AND
  if (Array.isArray(dep)) {
    return dep.every(d => this._dependencyMet(d));
  }

  // 🔹 Single condition (old format)
  if (dep.question_id) {
    const ans = this.answers[dep.question_id];
    if (ans == null) return false;

    const req = (dep.required_value || []).map(norm);
    return req.length === 0 || req.includes(norm(ans));
  }

  // 🔹 Unknown format → fail safe
  return false;
}



  async recordAnswer(questionId, answer) {
    
if (answer === "dont_know") {
  this.answerHistory.push({
    questionId,
    prevState: this._snapshotState()
  });

  this.skippedQuestions.add(questionId);
  this.asked.add(questionId); // ✅ ADD THIS
  return;
}



this.answerHistory.push({
  questionId,
  prevState: this._snapshotState()
});

  if (!this.diseasesLoaded) {
    await this.loadDiseases();
  }

  const q = this._findQuestionById(questionId);
  const qid = q?.id || questionId;
  const mapsTo = q?.maps_to;

  // ✅ Store answer ONCE
  this.answers[qid] = answer;
  this.asked.add(qid);

  const v = norm(answer);


// ✅ ROOT REJECTION — FINAL SAFE VERSION
if (q?.is_root && v === "no") {
  this.rejectedRoots.add(`${q.syndrome}:${q.root_key}`);

  if (mapsTo) {
    this.rejectedSymptoms.add(norm(mapsTo));
  }
}

  // === RED FLAG CHECK (NEW!) ===
  const activeDocs = [...this.syndromePerComplaint.values()].flat();
  for (const syndDoc of activeDocs) {
    if (!syndDoc.red_flags) continue;
    for (const flag of syndDoc.red_flags) {
      if (flag.question_id === qid) {
        const required = flag.required_value || ["yes"];
        if (required.map(norm).includes(v)) {
          this.redFlagTriggered = true;
          this.emergencyReason = flag.emergency_message || "Critical red flag detected";
          this.redFlagAlerts.push(flag.text || flag.emergency_message);
          // No return — continue processing for scoring
        }
      }
    }
  }
if (q?.type === "yesno" || !q?.type) {
  if (!mapsTo) return;

  const targets = Array.isArray(mapsTo) ? mapsTo : [mapsTo];

  for (const t of targets) {
    const key = norm(t);

    if (v === "yes") {
      if (this._isKnownSymptom(key)) {

        // 🔹 CLASSIFICATION — DECLARED FIRST
        const isImportant = this.diseases.some(d =>
          (d.important_symptoms || []).map(norm).includes(key)
        );

        const isClinical = this.diseases.some(d =>
          (d.clinical_features || []).map(norm).includes(key)
        );

        // 🔹 STORE BASED ON DISEASE METADATA
       if (isImportant) {
  this.importantSymptoms.add(key);
  this.selectedSymptoms.add(key);
} else if (isClinical) {
  this.clinicalFeatures.add(key);
} else {
  this.selectedSymptoms.add(key);
}


      } else {
        // Not a symptom → treat as risk factor
        this.riskFactors[key] = "yes";
      }
    } else {
      // Explicit negative evidence
      this.rejectedSymptoms.add(key);
    }
  }
}


  // === MCQ MODIFIERS ===
  if (q?.type === "mcq" && mapsTo) {
    this.modifiers[mapsTo] = norm(answer);
  }

  // Fallback
  if (!mapsTo && answer !== undefined) {
    this.modifiers[qid] = answer;
  }

}


  _findQuestionById(id) {
  for (const syndDocs of this.syndromePerComplaint.values()) {
    for (const doc of syndDocs) {
      const found = this._findQuestionInDoc(doc, id);
      if (found) return found;
    }
  }
  return null;
}


_isKnownSymptom(k) {
  const key = norm(k);
  return this.diseases.some(d =>
    [
      ...(d.symptoms || []),
      ...(d.clinical_features || []),
      ...(d.important_symptoms || [])
    ]
      .map(norm)
      .includes(key)
  );
}

goBack() {
  const last = this.answerHistory.pop();
  if (!last) return;

  const s = last.prevState;


  this.answers = s.answers;
  this.selectedSymptoms = s.selectedSymptoms;
  this.clinicalFeatures = s.clinicalFeatures;
  this.importantSymptoms = s.importantSymptoms;
  this.riskFactors = s.riskFactors;
  this.rejectedSymptoms = s.rejectedSymptoms;
  this.rejectedRoots = s.rejectedRoots;
  this.asked = s.asked;
  this.skippedQuestions = s.skippedQuestions;
  this.redFlagTriggered = s.redFlagTriggered;
  this.emergencyReason = s.emergencyReason;
  this.redFlagAlerts = s.redFlagAlerts;
}



  async getFinalDiagnosis() {
    if (!this.diseasesLoaded) await this.loadDiseases();
    const scored = await this._scoreDiseases();

    const top = scored[0] || { name: "No significant match", score: 0 };
const evidenceCount =
  this.selectedSymptoms.size +
  this.clinicalFeatures.size +
  Object.keys(this.riskFactors).length;

const isEmergency =
  top.score >= 0.97 && evidenceCount >= 3;


    const recommendation = isEmergency
      ? "Go to hospital immediately or call emergency services"
      : top.score >= 0.75
      ? "See a doctor within 24 hours"
      : top.score >= 0.50
      ? "Consult a doctor soon"
      : "Monitor symptoms at home. Rest and hydrate.";

    return {
      emergency: isEmergency,
      emergencyReason: isEmergency ? "High probability of serious condition" : null,
      recommendation,
      topDiagnosis: top,
      results: scored.slice(0, 5),
      activeSyndromes: [...this.activeSyndromes],
      collected: {
  answers: this.answers,
  selectedSymptoms: [...this.selectedSymptoms],
  clinicalFeatures: [...this.clinicalFeatures],
  riskFactors: this.riskFactors,
totalQuestionsAsked:
  this.asked.size - this.skippedQuestions.size
}

    };
  }

// services/SyndromicEngine.js
// ... (all previous imports and code remain unchanged until _scoreDiseases)

async _scoreDiseases() {
  const selected = [
    ...this.selectedSymptoms,
    ...this.clinicalFeatures,
    ...this.importantSymptoms
  ].map(norm);

  const scored = [];
  let maxRaw = 0;

  for (const disease of this.diseases) {
    const syms = (disease.symptoms || []).map(norm);
    const clin = (disease.clinical_features || []).map(norm);
    const imp = (disease.important_symptoms || []).map(norm);

    const matchedSymptoms = syms.filter(s => selected.includes(s));
    const matchedClinical = clin.filter(s => selected.includes(s));
    const matchedImportant = imp.filter(s => this.importantSymptoms.has(s));

    // Count matched risk factors for this specific disease
    let matchedRiskCount = 0;
    for (const key of Object.keys(disease.risk_factors || {})) {
      if (this.riskFactors[norm(key)]) {
        matchedRiskCount++;
      }
    }

    // Total matched inputs for this disease
    const matchedEvidenceCount =
      matchedSymptoms.length +
      matchedClinical.length +
      matchedImportant.length +
      matchedRiskCount;

    // NEW REQUIREMENT: Only consider diseases with 5 or more matched inputs
    if (matchedEvidenceCount < 2) {
      continue; // Skip this disease entirely
    }

    // BLOCK pure risk-only diagnosis (still keep this safety check)
    const symptomEvidenceCount =
      matchedSymptoms.length +
      matchedClinical.length +
      matchedImportant.length;
    if (symptomEvidenceCount === 0) {
      continue;
    }

    let raw = 0;

    // Evidence weights
    raw += matchedSymptoms.length * 1.0;
    raw += matchedClinical.length * 1.5;
    raw += matchedImportant.length * 2.0;

    // Risk factors
    for (const [key, weight] of Object.entries(disease.risk_factors || {})) {
      if (this.riskFactors[norm(key)]) {
        raw += Number(weight || 0);
      }
    }

    // Modifiers
    if (disease.modifiers) {
      for (const [modKey, options] of Object.entries(disease.modifiers)) {
        const userVal = this.modifiers[modKey];
        if (userVal && options[userVal] !== undefined) {
          raw *= Number(options[userVal]);
        }
      }
    }

    if (raw === 0) continue;

    // Dampening based on total evidence (now guaranteed ≥5)
    if (matchedEvidenceCount <= 5) raw *= 0.85;      // slight dampen at minimum threshold
    else if (matchedEvidenceCount <= 7) raw *= 0.95;

    // Age
    if (disease.age_groups && this.age !== null) {
      const bucket = this._ageBucket(this.age);
      if (disease.age_groups[bucket]) {
        raw *= Number(disease.age_groups[bucket]);
      }
    }

    // Sex
    if (disease.sex_bias && this.sex) {
      if (disease.sex_bias[this.sex]) {
        raw *= Number(disease.sex_bias[this.sex]);
      }
    }

    // Prevalence
    raw *= 1 + (Number(disease.prevalence || 0) * 0.001);

    if (raw > maxRaw) maxRaw = raw;

    scored.push({
      icd: disease.icd,
      name: disease.name,
      raw,
      evidenceCount: matchedEvidenceCount, // optional: expose for debugging
    });
  }

  // Normalize scores
  return scored
    .map(d => ({
      icd: d.icd,
      name: d.name,
      score: Number((maxRaw ? d.raw / maxRaw : 0).toFixed(4)),
      evidenceCount: d.evidenceCount // optional: include in output if desired
    }))
    .sort((a, b) => b.score - a.score);
}

// ... (rest of the class remains unchanged)



async match(input = {}) {
  if (!this.diseasesLoaded) await this.loadDiseases();
  if (!this.syndromesLoaded) await this.loadSyndromes();

 

  const {
    answers = {},
    symptoms = [],
    riskFactors = {},
    habits = []
  } = input;

  // Inject answers
  for (const [qid, val] of Object.entries(answers)) {
    this.answers[qid] = val;
  }

  // Inject symptoms directly
  for (const s of symptoms) {
    this.selectedSymptoms.add(norm(s));
  }

  // Inject risk factors
  for (const [k, v] of Object.entries(riskFactors)) {
    if (v === true || v === "yes") {
      this.riskFactors[norm(k)] = "yes";
    }
  }

  // Inject habits (optional)
  for (const h of habits) {
    const key = norm(h);
    const isRisk = this.diseases.some(d =>
      Object.keys(d.risk_factors || {}).map(norm).includes(key)
    );
    if (isRisk) this.riskFactors[key] = "yes";
  }
await this.detectSyndromes();

  // Final scoring
  return await this.getFinalDiagnosis();
}

  _ageBucket(age) {
    const a = Number(age);
    if (a < 5) return "0-4";
    if (a < 15) return "5-14";
    if (a < 25) return "15-24";
    if (a < 45) return "25-44";
    if (a < 65) return "45-64";
    return "65+";
  }

  getState() {
    return {
      chiefComplaints: this.chiefComplaints,
      bodyParts: this.bodyParts,
      age: this.age,
      sex: this.sex,
      habits: [...this.habits],
      clinicalFeatures: [...this.clinicalFeatures],
      activeSyndromes: [...this.activeSyndromes],
      answers: this.answers,
      selectedSymptoms: [...this.selectedSymptoms],
      riskFactors: this.riskFactors,
      asked: [...this.asked],
    };
  }
}