// services/SymptomEngine.js

import Disease from "../models/Disease.js";

const norm = (s) => s?.toString().toLowerCase().trim();

// -----------------------------------------
// CENTRAL WEIGHTED INFERENCE SCORING CONFIG
// --- Weights are now scaling factors for custom disease weights (e.g., 3.5)
// -----------------------------------------
const SCORE_CONFIG = {
  symptomWeight: 0.05,          // Reduced to dampen simple symptom count
  primaryRegionWeight: 0.22,    
  affectedRegionWeight: 0.14,
  
  // New Scaling Factors for Modifier/Risk Factor weights (e.g., if a disease weight is 3.5)
  MOD_SCALE_FACTOR: 0.5,        // Scales custom modifier weights
  RISK_SCALE_FACTOR: 0.4,       // Scales custom risk factor weights
  
  // These old fields are now unused, but kept for reference
  modifierWeight: 0.0,
  riskFactorWeight: 0.0,
  prevalenceMultiplier: 0.001
};

export default class SymptomEngine {
  constructor() {
    this.diseases = [];
    this.diseaseByIcd = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;

    this.diseases = await Disease.find({}).lean();
    this.diseaseByIcd = new Map(this.diseases.map((d) => [d.icd, d]));

    this.loaded = true;
    console.log(
      `SymptomEngine: Loaded ${this.diseases.length} diseases (WEIGHTED INFERENCE mode)`
    );
  }

  // ----------------------------------------------------
  // MATCH ENGINE
  // ----------------------------------------------------
  async match(
    selectedSymptoms = [],
    bodyParts = [],
    modifiers = {},
    habits = {},
    rejectedSymptoms = [],
    patientAge = null,
    patientSex = null
  ) {
    await this.load();

    const selectedNorm = selectedSymptoms.map(norm);
    const rejectedNorm = rejectedSymptoms.map(norm);
    const habitArray = Array.isArray(habits)
      ? habits.map(norm)
      : Object.keys(habits || {})
          .filter((k) => habits[k])
          .map(norm);

    const results = [];
    let maxRawScore = 0;

    const matchRegion = (a, b) => norm(a) === norm(b);

    // --------------------------------------
    // FIRST PASS — CALCULATE RAW SCORE
    // --------------------------------------
    for (const disease of this.diseases) {
      const diseaseSymptomsNorm = (disease.symptoms || []).map(norm);
      if (diseaseSymptomsNorm.length === 0) continue;

      const matchedSymptoms = diseaseSymptomsNorm.filter((s) =>
        selectedNorm.includes(s)
      );
      if (matchedSymptoms.length === 0) continue;

      // BODY REGION MATCHING
      const bodyMatch =
        bodyParts.length === 0 ||
        bodyParts.some(
          (bp) =>
            matchRegion(bp, disease.primary_region) ||
            (disease.affected_parts || []).some((ap) =>
              matchRegion(bp, ap)
            )
        );

      if (!bodyMatch) continue;

      let rawScore = 0;
      const reasons = [];

      // IMPORTANT SYMPTOMS (unchanged logic)
      const importantSymptoms = (disease.important_symptoms || []).map(norm);
      const matchedImportant = matchedSymptoms.filter((s) =>
        importantSymptoms.includes(s)
      );

      if (matchedImportant.length > 0) {
        const boost = 2 + matchedImportant.length * 1; 
        rawScore += boost;
        reasons.push(
          `+${boost} (important symptoms: ${matchedImportant.join(", ")})`
        );
      }

      // REJECTED IMPORTANT SYMPTOMS (unchanged logic)
      const rejectedImportant = rejectedNorm.filter((s) =>
        importantSymptoms.includes(s)
      );
      if (rejectedImportant.length > 0) {
        const penalty = -10 * rejectedImportant.length;
        rawScore += penalty;
        reasons.push(
          `${penalty} (important symptom rejected: ${rejectedImportant.join(
            ", "
          )})`
        );
      }


      // GENERAL SYMPTOMS
      const symAdd = matchedSymptoms.length * SCORE_CONFIG.symptomWeight;
      rawScore += symAdd;
      reasons.push(`+${symAdd.toFixed(3)} (${matchedSymptoms.length} symptom(s))`);

      // SYMPTOM COUNT PENALTY/BOOST (unchanged logic)
      if (matchedSymptoms.length <= 2) {
        rawScore *= 0.12;   // 88% penalty
        reasons.push(`×0.12 (only ${matchedSymptoms.length} symptom(s) → extremely weak)`);
      } else if (matchedSymptoms.length <= 4) {
        rawScore *= 0.38;
        reasons.push(`×0.38 (few symptoms → weak evidence)`);
      }
      
      // OVERLAP BONUS (unchanged logic)
      let overlapBonus = 0;
      if (matchedSymptoms.length >= 8) overlapBonus = 3;
      else if (matchedSymptoms.length >= 6) overlapBonus = 2;
      else if (matchedSymptoms.length >= 4) overlapBonus = 1;

      if (overlapBonus > 0) {
        rawScore += overlapBonus;
        reasons.push(`+${overlapBonus} (symptom overlap bonus)`);
      }

      // REGION BOOSTS (unchanged logic)
      if (bodyParts.some((bp) => matchRegion(bp, disease.primary_region))) {
        rawScore += SCORE_CONFIG.primaryRegionWeight;
        reasons.push(
          `+${SCORE_CONFIG.primaryRegionWeight} (primary region match)`
        );
      } else if (
        bodyParts.some((bp) =>
          (disease.affected_parts || []).some((ap) => matchRegion(bp, ap))
        )
      ) {
        rawScore += SCORE_CONFIG.affectedRegionWeight;
        reasons.push(
          `+${SCORE_CONFIG.affectedRegionWeight} (affected region match)`
        );
      }

      // 💥 RISK FACTORS (HABITS) - NOW USES CUSTOM WEIGHTS
      let habitBonus = 0;
      for (const habit of habitArray) {
        const clean = habit.replace(/[^a-z0-9]/g, "_");
        const risks = disease.risk_factors || {};
        const weight = risks[clean] || risks[habit] || 1;

        if (weight > 1) {
          // Use custom weight (e.g., 2.7 for poor_hygiene) scaled down
          const contribution = (weight - 1) * SCORE_CONFIG.RISK_SCALE_FACTOR;
          habitBonus += contribution;
          reasons.push(
            `+${contribution.toFixed(
              2
            )} (risk factor: ${habit} using custom weight ${weight})`
          );
        }
      }
      rawScore += habitBonus;

      // 💥 MODIFIERS - NOW USES CUSTOM WEIGHTS
      for (const [modKey, modObj] of Object.entries(modifiers || {})) {
        if (!modObj || typeof modObj !== "object") continue;

        const cleanKey = norm(modKey).replace(/[^a-z0-9]/g, "_");

        for (const [answer, active] of Object.entries(modObj)) {
          if (!active) continue;

          const cleanVal = norm(answer).replace(/[^a-z0-9]/g, "_");

          const weight =
            disease.modifiers?.[cleanKey]?.[cleanVal] ||
            disease.modifiers?.[cleanKey]?.[answer] ||
            1;

          if (weight > 1) {
            // Use custom weight (e.g., 3.5 for bloody diarrhea) scaled down
            const contribution = (weight - 1) * SCORE_CONFIG.MOD_SCALE_FACTOR;
            rawScore += contribution;
            reasons.push(
              `+${contribution.toFixed(
                2
              )} (modifier: ${cleanKey}=${cleanVal} using custom weight ${weight})`
            );
          }
        }
      }

      // AGE & SEX MULTIPLIER (unchanged logic)
      if (patientAge !== null) {
        const group =
          patientAge <= 4
            ? "0-4"
            : patientAge <= 14
            ? "5-14"
            : patientAge <= 24
            ? "15-24"
            : patientAge <= 44
            ? "25-44"
            : patientAge <= 64
            ? "45-64"
            : "65+";

        const factor = disease.age_groups?.[group] || 1;
        if (factor !== 1) {
          rawScore *= factor;
          reasons.push(`×${factor.toFixed(2)} (age group: ${group})`);
        }
      }

      if (patientSex) {
        const factor = disease.sex_bias?.[patientSex] || 1;
        if (factor !== 1) {
          rawScore *= factor;
          reasons.push(`×${factor.toFixed(2)} (sex bias: ${patientSex})`);
        }
      }

      // PREVALENCE ADJUSTMENT (unchanged logic)
      rawScore *= 1 + disease.prevalence * SCORE_CONFIG.prevalenceMultiplier;
      reasons.push(
        `×${(
          1 +
          disease.prevalence * SCORE_CONFIG.prevalenceMultiplier
        ).toFixed(3)} (prevalence adj)`
      );

      // REJECTED REGULAR SYMPTOMS (unchanged logic)
      const rejectedRegular = rejectedNorm.filter((s) =>
        diseaseSymptomsNorm.includes(s)
      );
      if (rejectedRegular.length > 0) {
        rawScore *= Math.pow(0.5, rejectedRegular.length);
        reasons.push(
          `×0.5^${rejectedRegular.length} (rejected symptoms)`
        );
      }

      rawScore = Math.max(rawScore, 0.0001); 
      maxRawScore = Math.max(maxRawScore, rawScore);

      results.push({
        icd: disease.icd,
        name: disease.name,
        rawScore,
        reasons,
        matched: matchedSymptoms,
        matchedImportant: matchedImportant.length,
        category: disease.category,
        primary_region: disease.primary_region,
        affected_parts: disease.affected_parts
      });
    }

    // --------------------------------------
    // SECOND PASS — NORMALIZE (unchanged logic)
    // --------------------------------------
    if (maxRawScore === 0) maxRawScore = 1;

    const final = results.map((r) => {
      const normalizedScore = Number((r.rawScore / maxRawScore).toFixed(4));
      return {
        ...r,
        score: normalizedScore,
        rawScore: Number(r.rawScore.toFixed(3)),
        debug: {
          rawScore: r.rawScore,
          normalizedScore,
          reasons: r.reasons,
          matchedCount: r.matched.length,
          importantMatched: r.matchedImportant
        }
      };
    });

    final.sort((a, b) => b.score - a.score);
    return final.slice(0, 20);
  }

  // ----------------------------------------------------
  // NEXT SYMPTOM SUGGESTION LOGIC
  // ----------------------------------------------------
  async nextSymptom(
    selected = [],
    rejected = [],
    bodyParts = [],
    questionCount = 0,
    maxQuestions = 20,
    modifiers = {},
    habits = {},
    age = null,
    sex = null
  ) {
    if (questionCount >= maxQuestions)
      return { done: true, reason: "max_questions" };

    const top = await this.match(
      selected,
      bodyParts,
      modifiers,
      habits,
      rejected,
      age,
      sex
    );

    if (!top.length) return { done: true, reason: "no_matches" };
    if (top[0].score >= 0.20)
      return {
        done: true,
        reason: "high_confidence",
        topScore: top[0].score,
        disease: top[0]
      };

    const counts = {};
    for (const m of top.slice(0, 6)) {
      const d = this.diseaseByIcd.get(m.icd);
      if (!d) continue;

      for (const s of d.symptoms || []) {
        const n = norm(s);
        if (!selected.map(norm).includes(n) && !rejected.map(norm).includes(n)) {
          counts[n] = (counts[n] || 0) + m.score;
        }
      }
    }

    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!best) return { done: true, reason: "no_more_questions" };

    return {
      done: false,
      next: best[0],
      topScore: top[0].score,
      topDisease: top[0].name,
      remaining: maxQuestions - questionCount - 1
    };
  }

  // ----------------------------------------------------
  // FINAL DIAGNOSIS
  // ----------------------------------------------------
  async finalDiagnosis(...args) {
    const ranked = await this.match(...args);

    return ranked.map((r) => ({
      ...r,
      score: Number(r.score.toFixed(4)),
      recommendation:
        r.score >= 0.97
          ? "Very high confidence – seek immediate medical attention"
          : r.score >= 0.9
          ? "High probability – consult doctor urgently"
          : r.score >= 0.75
          ? "Likely – schedule medical evaluation soon"
          : r.score >= 0.5
          ? "Possible – monitor and consider consultation"
          : "Low probability – other causes more likely"
    }));
  }
}
