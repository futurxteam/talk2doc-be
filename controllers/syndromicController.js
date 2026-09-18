// controllers/syndromicController.js — FINAL & ERROR-FREE
import SyndromicEngine from "../services/SyndromicEngine.js";

const sessions = new Map();

const generateSessionId = () =>
  Date.now().toString(36) + Math.random().toString(36).substr(2);

// START ASSESSMENT
export const startSyndromic = async (req, res) => {
  try {
    const { chiefComplaints, bodyParts = [], age, sex, habits = [] } = req.body;

    if (!chiefComplaints || (Array.isArray(chiefComplaints) ? chiefComplaints.length === 0 : !chiefComplaints)) {
      return res.status(400).json({ error: "At least one chief complaint is required" });
    }

    // Ensure arrays
    const complaints = Array.isArray(chiefComplaints) ? chiefComplaints : [chiefComplaints];
    let parts = Array.isArray(bodyParts) ? bodyParts : bodyParts ? [bodyParts] : [];

    // If only one body part → apply to all complaints
    if (parts.length === 1 && complaints.length > 1) {
      const singlePart = parts[0];
      parts = complaints.map(() => singlePart);
    }

    const sessionId = generateSessionId();

    const engine = await SyndromicEngine.create({
      chiefComplaints: complaints,
      bodyParts: parts,
      age: age ?? null,
      sex: sex || null,
      habits,
    });

const nextQuestions = await engine.findNextQuestions(5);

    sessions.set(sessionId, engine);

    res.json({
  sessionId,
  questions: nextQuestions,
  done: nextQuestions.length === 0,
  emergency: engine.redFlagTriggered,
  emergencyReason: engine.emergencyReason,
  activeSyndromes: [...engine.activeSyndromes],
  message: "Assessment started",
});

  } catch (err) {
    console.error("startSyndromic ERROR:", err);
    res.status(500).json({ error: "Failed to start assessment" });
  }
};

// ANSWER QUESTION
export const answerSyndromic = async (req, res) => {
  try {
    const { sessionId, answers = [], action } = req.body;

    const engine = sessions.get(sessionId);
    if (!engine) {
      return res.status(404).json({ error: "Invalid or expired session" });
    }

    // ⬅️ GO BACK SUPPORT
    if (action === "go_back") {
      engine.goBack();
      const questions = await engine.findNextQuestions(5);

      return res.json({
        sessionId,
        questions,
        done: false,
        emergency: engine.redFlagTriggered,
        emergencyReason: engine.emergencyReason,
        activeSyndromes: [...engine.activeSyndromes],
      });
    }

    // 🛑 SAFETY: no answers submitted
    if (!Array.isArray(answers) || answers.length === 0) {
      const questions = await engine.findNextQuestions(5);
      return res.json({ sessionId, questions, done: false });
    }

    // ✅ PROCESS ALL ANSWERS (BATCH)
    for (const { questionId, answer } of answers) {
      await engine.recordAnswer(questionId, answer);
    }

    const questions = await engine.findNextQuestions(5);

    // ✅ INTERVIEW COMPLETE
    if (questions.length === 0) {
      const diagnosis = await engine.getFinalDiagnosis();
      sessions.delete(sessionId);

      return res.json({
        done: true,
        ...diagnosis,
      });
    }

    // ✅ CONTINUE INTERVIEW
    return res.json({
      sessionId,
      questions,
      done: false,
      emergency: engine.redFlagTriggered,
      emergencyReason: engine.emergencyReason,
      activeSyndromes: [...engine.activeSyndromes],
    });

  } catch (err) {
    console.error("answerSyndromic ERROR:", err);
    res.status(500).json({ error: "Failed to process answers" });
  }
};

    


// DEBUG / RESUME
export const getSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const engine = sessions.get(sessionId);

    if (!engine) {
      return res.status(404).json({ error: "Session not found or expired" });
    }

const nextQuestions = await engine.findNextQuestions(5);

   res.json({
  sessionId,
  activeSyndromes: [...engine.activeSyndromes],
questionsAsked: engine.asked.size - engine.skippedQuestions.size,
  redFlagTriggered: engine.redFlagTriggered,
  emergencyReason: engine.emergencyReason,
  hasMoreQuestions: nextQuestions.length > 0,
  questions: nextQuestions,
  state: engine.getState(),
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get session status" });
  }
};


/**
 * POST /api/engine/match
 * Direct disease matching without interactive Q&A
 */
export const matchDisease = async (req, res) => {
  try {
    const {
      chiefComplaints = [],
      bodyParts = [],
      age = null,
      sex = null,

      // direct injection
      symptoms = [],
      riskFactors = {},
      habits = [],
      answers = {}
    } = req.body;

    // 1️⃣ Create engine (loads syndromes + diseases)
    const engine = await SyndromicEngine.create({
      chiefComplaints,
      bodyParts,
      age,
      sex,
      habits
    });

    // 2️⃣ Call match() (your new helper)
    const result = await engine.match({
      symptoms,
      riskFactors,
      habits,
      answers
    });

    // 3️⃣ Return clean result
    res.status(200).json({
      success: true,
      mode: "direct_match",
      input: {
        chiefComplaints,
        symptoms,
        riskFactors,
        habits
      },
      result
    });

  } catch (err) {
    console.error("❌ Match error:", err);
    res.status(500).json({
      success: false,
      message: "Disease matching failed",
      error: err.message
    });
  }
};
