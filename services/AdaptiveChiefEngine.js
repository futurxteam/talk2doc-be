// services/AdaptiveChiefEngine.js
import ChiefComplaint from "../models/chiefComplaint.js";
import axios from "axios";

const BODY_REGION_ALIASES = {
  // === Head & Neck ===
  head: "Head & Neck", scalp: "Head & Neck", forehead: "Head & Neck",
  face: "Head & Neck", eyes: "Head & Neck", eye: "Head & Neck",
  ears: "Head & Neck", ear: "Head & Neck", nose: "Head & Neck",
  mouth: "Head & Neck", tongue: "Head & Neck", jaw: "Head & Neck",
  throat: "Head & Neck", neck: "Head & Neck",

  // === Chest ===
  chest: "Chest", lungs: "Chest", lung: "Chest", heart: "Chest",
  breast: "Chest", breasts: "Chest", "chest wall": "Chest",

  // === Upper Abdomen ===
  "upper abdomen": "Upper Abdomen", "upper belly": "Upper Abdomen",
  stomach: "Upper Abdomen", epigastric: "Upper Abdomen",
  liver: "Upper Abdomen", spleen: "Upper Abdomen",
  gallbladder: "Upper Abdomen", pancreas: "Upper Abdomen",
  "right upper abdomen": "Upper Abdomen", "left upper abdomen": "Upper Abdomen",
  ruq: "Upper Abdomen", luq: "Upper Abdomen",

  // === Lower Abdomen / Pelvis ===
  "lower abdomen": "Lower Abdomen / Pelvis", "lower belly": "Lower Abdomen / Pelvis",
  pelvis: "Lower Abdomen / Pelvis", pelvic: "Lower Abdomen / Pelvis",
  "small intestine": "Lower Abdomen / Pelvis", "large intestine": "Lower Abdomen / Pelvis",
  colon: "Lower Abdomen / Pelvis", appendix: "Lower Abdomen / Pelvis",
  "right lower abdomen": "Lower Abdomen / Pelvis", rlq: "Lower Abdomen / Pelvis",
  "left lower abdomen": "Lower Abdomen / Pelvis", llq: "Lower Abdomen / Pelvis",

  // === Back & Spine ===
  back: "Back & Spine", "upper back": "Back & Spine", "mid back": "Back & Spine",
  "lower back": "Back & Spine", spine: "Back & Spine", lumbar: "Back & Spine",

  // === Limbs ===
  shoulder: "Upper Limb", shoulders: "Upper Limb", arm: "Upper Limb", arms: "Upper Limb",
  "upper arm": "Upper Limb", elbow: "Upper Limb", elbows: "Upper Limb",
  forearm: "Upper Limb", wrist: "Upper Limb", wrists: "Upper Limb",
  hand: "Upper Limb", hands: "Upper Limb", palm: "Upper Limb", finger: "Upper Limb", fingers: "Upper Limb",
  hip: "Lower Limb", hips: "Lower Limb", thigh: "Lower Limb", thighs: "Lower Limb",
  knee: "Lower Limb", knees: "Lower Limb", calf: "Lower Limb", calves: "Lower Limb",
  "lower leg": "Lower Limb", ankle: "Lower Limb", ankles: "Lower Limb",
  foot: "Lower Limb", feet: "Lower Limb", toe: "Lower Limb", toes: "Lower Limb",

  // === Genitals & Groin ===
  groin: "Genitals & Groin", pubic: "Genitals & Groin", genitals: "Genitals & Groin",
  vagina: "Genitals & Groin", penis: "Genitals & Groin", testicles: "Genitals & Groin",
  scrotum: "Genitals & Groin", perineum: "Genitals & Groin",

  // === Buttocks & Rectal ===
  butt: "Buttocks & Rectal Area", buttocks: "Buttocks & Rectal Area",
  anus: "Buttocks & Rectal Area", rectal: "Buttocks & Rectal Area", rectum: "Buttocks & Rectal Area",

  // === Systemic / Whole Body ===
  "whole body": "Whole Body", systemic: "Whole Body", everywhere: "Whole Body",
  fever: "Whole Body", fatigue: "Whole Body", "all over": "Whole Body",

  // === Direct canonical fallbacks ===
  "head & neck": "Head & Neck",
  "upper abdomen": "Upper Abdomen",
  "lower abdomen / pelvis": "Lower Abdomen / Pelvis",
  "back & spine": "Back & Spine",
  "upper limb": "Upper Limb",
  "lower limb": "Lower Limb",
  "genitals & groin": "Genitals & Groin",
  "buttocks & rectal area": "Buttocks & Rectal Area",
  "body systems": "Body Systems",
  "whole body": "Whole Body",
};

function _normalizeBodyParts(list) {
  return (list || []).map((part) => {
    if (!part || typeof part !== "string") return part;
    const cleaned = part.toLowerCase().trim().replace(/\s+/g, " ").replace(/[-_]/g, " ");
    if (BODY_REGION_ALIASES[cleaned]) return BODY_REGION_ALIASES[cleaned];
    for (const [alias, canonical] of Object.entries(BODY_REGION_ALIASES)) {
      if (cleaned.includes(alias) || alias.includes(cleaned)) return canonical;
    }
    return part;
  });
}

export default class AdaptiveChiefEngine {
  constructor(input) {
    this.chiefComplaints = Array.isArray(input?.chiefComplaints)
      ? input.chiefComplaints.filter(c => typeof c === "string" && c.trim()).map(c => c.toLowerCase().trim())
      : [];
    this.bodyParts = Array.isArray(input?.bodyParts) ? _normalizeBodyParts(input.bodyParts) : [];
    this.answers = {};
    this.modifiers = {};
    this.habits = new Set();
    this.askedQuestionIds = new Set();
    this.modifierQuestions = new Set();
    this.habitQuestions = new Set();
    this._dynamicRulesLoaded = false;
  }

  static async create(input) {
    const engine = new AdaptiveChiefEngine(input);
    await engine._loadDynamicRules();
    return engine;
  }

  static async fromState(state) {
    const engine = new AdaptiveChiefEngine(state);
    engine.answers = state.answers || {};
    engine.modifiers = state.modifiers || {};
    engine.habits = new Set(state.habits || []);
    engine.askedQuestionIds = new Set(state.askedQuestionIds || []);
    await engine._loadDynamicRules();
    return engine;
  }

  async _loadDynamicRules() {
    if (this._dynamicRulesLoaded) return;
    const all = await ChiefComplaint.find({}, { "body_parts.questions": 1 }).lean();
    for (const cc of all) {
      for (const bp of cc.body_parts || []) {
        for (const q of bp.questions || []) {
          if (q.type === "mcq" || q.is_modifier) this.modifierQuestions.add(q.id);
          if (q.type === "yesno" || q.is_habit || q.is_risk_factor) this.habitQuestions.add(q.id);
        }
      }
    }
    this._dynamicRulesLoaded = true;
  }

  getState() {
    return {
      chiefComplaints: this.chiefComplaints,
      bodyParts: this.bodyParts,
      answers: this.answers,
      modifiers: this.modifiers,
      habits: [...this.habits],
      askedQuestionIds: [...this.askedQuestionIds],
    };
  }

  // NEW: Check if a question's dependency is satisfied
  _isDependencySatisfied(q) {
    if (!q.depends_on?.question_id) return true;
    const { question_id, required_value = [] } = q.depends_on;
    if (!this.askedQuestionIds.has(question_id)) return false;
    const answer = this.answers[question_id];
    if (!answer) return false;
    const normAnswer = String(answer).toLowerCase().trim();
    const required = required_value.map(v => String(v).toLowerCase().trim());
    return required.length === 0 || required.includes(normAnswer);
  }

  async findNextQuestion() {
    await this._loadDynamicRules();

    const complaints = await ChiefComplaint.find(
      { name: { $in: this.chiefComplaints } },
      { body_parts: 1 }
    ).lean();

    const candidates = [];
    const seen = new Set();

    for (const cc of complaints) {
      for (const bp of cc.body_parts || []) {
        const bpNames = (bp.name || []).map(n => String(n).toLowerCase().trim());
        const bpSubs = (bp.sub_regions || []).map(s => String(s).toLowerCase().trim());
        const regionMatch = this.bodyParts.some(p => {
          const key = String(p).toLowerCase().trim();
          return bpNames.includes(key) || bpSubs.includes(key);
        });
        if (!regionMatch) continue;

        for (const q of bp.questions || []) {
          if (!q.text?.trim()) continue;
          if (this.askedQuestionIds.has(q.id)) continue;
          if (seen.has(q.id)) continue;
          if (!this._isDependencySatisfied(q)) continue; // DEPENDS_ON BLOCK

          seen.add(q.id);
          candidates.push({ ...q, source: "rule" });
        }
      }
    }

    // RULE-BASED SUCCESS
    if (candidates.length > 0) {
      candidates.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      const next = candidates[0];
      this.askedQuestionIds.add(next.id);
      return next;
    }

    // FALLBACK → AI BOOSTER with real remaining questions
    const remaining = await this._getAllEligibleQuestions(complaints);
    return await this._aiBoosterNextQuestion(remaining);
  }

  // Collect all questions that *could* be asked (respecting depends_on)
  async _getAllEligibleQuestions(complaints) {
    const eligible = [];
    const seen = new Set();

    for (const cc of complaints) {
      for (const bp of cc.body_parts || []) {
        for (const q of bp.questions || []) {
          if (!q.text?.trim()) continue;
          if (this.askedQuestionIds.has(q.id)) continue;
          if (seen.has(q.id)) continue;
          if (!this._isDependencySatisfied(q)) continue;

          seen.add(q.id);
          eligible.push(q);
        }
      }
    }
    return eligible;
  }

  async _aiBoosterNextQuestion(remainingQuestions) {
    if (!remainingQuestions || remainingQuestions.length === 0) return null;

    try {
      const response = await axios.post("https://talk2doc-be.onrender.com/api/ai-booster", {
        state: this.getState(),
        remainingQuestions
      }, { timeout: 12000 });

      const q = response.data?.question;
      if (!q || !remainingQuestions.some(r => r.id === q.id)) return null;

      this.askedQuestionIds.add(q.id);
      return q;
    } catch (err) {
      console.error("AI booster failed:", err.message);
      return null;
    }
  }

  recordAnswer(id, value) {
    const val = String(value).toLowerCase().trim();
    if (val === "dont_know" || val === "don't know") {
      this.askedQuestionIds.add(id);
      return;
    }

    this.answers[id] = val;

    if (this.modifierQuestions.has(id)) {
      if (!this.modifiers[id]) this.modifiers[id] = {};
      this.modifiers[id][val] = true;
    }

    if (this.habitQuestions.has(id)) {
      if (val === "yes") this.habits.add(id);
      else this.habits.delete(id);
    }

    this.askedQuestionIds.add(id);
  }
}