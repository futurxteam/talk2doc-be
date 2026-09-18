// controllers/symptomController.js
import SymptomEngine from "../services/SymptomEngine.js";

const engineCache = {};

async function getEngine() {
  if (!engineCache.instance) {
    const engine = new SymptomEngine();
    await engine.load();
    engineCache.instance = engine;
    console.log("SymptomEngine initialized & cached");
  }
  return engineCache.instance;
}

export const matchDiseases = async (req, res) => {
  try {
    const { selected = [], bodyPart, modifiers = {}, habits = {}, rejected = [], age, sex } = req.body;
    if (!Array.isArray(selected) || selected.length === 0)
      return res.status(400).json({ error: "At least one symptom required" });

    const bodyPartsArray = Array.isArray(bodyPart) ? bodyPart : typeof bodyPart === "string" ? [bodyPart] : [];
    const validSex = sex && ["male", "female"].includes(sex.toLowerCase()) ? sex.toLowerCase() : null;
    const patientAge = age != null && !isNaN(age) && age >= 0 ? Number(age) : null;

    const engine = await getEngine();
    const matches = await engine.match(selected, bodyPartsArray, modifiers, habits, rejected, patientAge, validSex);

    res.json({
      success: true,
      results: matches,
      input: req.body
    });
  } catch (err) {
    console.error("matchDiseases error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const nextSymptom = async (req, res) => {
  try {
    const { selected = [], rejected = [], bodyPart, questionCount = 0, maxQuestions = 20, modifiers = {}, habits = {}, age, sex } = req.body;

    const bodyPartsArray = Array.isArray(bodyPart) ? bodyPart : typeof bodyPart === "string" ? [bodyPart] : [];
    const validSex = sex && ["male", "female"].includes(sex.toLowerCase()) ? sex.toLowerCase() : null;
    const patientAge = age != null && !isNaN(age) && age >= 0 ? Number(age) : null;

    const engine = await getEngine();
    const result = await engine.nextSymptom(selected, rejected, bodyPartsArray, questionCount, maxQuestions, modifiers, habits, patientAge, validSex);

    res.json({ success: true, ...result, input: req.body });
  } catch (err) {
    console.error("nextSymptom error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const finalResults = async (req, res) => {
  try {
    const { selected = [], bodyPart, modifiers = {}, habits = {}, rejected = [], age, sex } = req.body;
    if (!Array.isArray(selected) || selected.length === 0)
      return res.status(400).json({ error: "At least one symptom required" });

    const bodyPartsArray = Array.isArray(bodyPart) ? bodyPart : typeof bodyPart === "string" ? [bodyPart] : [];
    const validSex = sex && ["male", "female"].includes(sex.toLowerCase()) ? sex.toLowerCase() : null;
    const patientAge = age != null && !isNaN(age) && age >= 0 ? Number(age) : null;

    const engine = await getEngine();
    const results = await engine.finalDiagnosis(selected, bodyPartsArray, modifiers, habits, rejected, patientAge, validSex);

    res.json({
      success: true,
      done: true,
      results,
      input: req.body
    });
  } catch (err) {
    console.error("finalResults error:", err);
    res.status(500).json({ error: err.message });
  }
};