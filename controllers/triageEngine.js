// controllers/triageController.js
import UnifiedTriageEngine from "../services/UnifiedTriageEngine.js";

const sessions = new Map();

export const startTriage = async (req, res) => {
  const { chiefComplaints, bodyParts } = req.body;
  const engine = new UnifiedTriageEngine({ chiefComplaints, bodyParts });
  await engine.init();
  const next = await engine.findNextQuestion();
  const sessionId = Date.now().toString();
  sessions.set(sessionId, engine);
  res.json({ sessionId, next, state: engine.getState(), done: next.done });
};

export const answerQuestion = async (req, res) => {
  const { sessionId, questionId, answer } = req.body;
  const engine = sessions.get(sessionId);
  if (!engine) return res.status(404).json({ error: "Session not found" });

  engine.recordAnswer(questionId, answer);
  const next = await engine.findNextQuestion();
  const ranking = await engine.getRanking();

  res.json({
    next: next.question || null,
    done: next.done || false,
    topDiagnosis: ranking[0],
    state: engine.getState()
  });
};

export const getFinalResults = async (req, res) => {
  const { sessionId } = req.body;
  const engine = sessions.get(sessionId);
  if (!engine) return res.status(404).json({ error: "Session not found" });

  const ranking = await engine.getRanking();
  res.json({
    success: true,
    done: true,
    results: ranking.map(r => ({
      name: r.disease,
      score: r.norm.toFixed(4),
      recommendation: r.norm >= 0.97 ? "Seek immediate care" : "Consult doctor"
    }))
  });
};