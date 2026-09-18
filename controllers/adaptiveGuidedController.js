// controllers/adaptiveGuidedController.js
import AdaptiveChiefEngine from "../services/AdaptiveChiefEngine.js";

function ensureArray(x) {
  return Array.isArray(x) ? x : x ? [x] : [];
}
export const startAdaptive = async (req, res) => {
  try {
    let { chiefComplaints, bodyParts } = req.body;

    chiefComplaints = Array.isArray(chiefComplaints) ? chiefComplaints : [chiefComplaints];
    bodyParts = Array.isArray(bodyParts) ? bodyParts : [bodyParts];

    const engine = await AdaptiveChiefEngine.create({ chiefComplaints, bodyParts });

    const next = await engine.findNextQuestion();

    return res.json({
      state: engine.getState(),
      next,
      done: !next
    });
  } catch (err) {
    console.error("startAdaptive ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
export const answerAdaptive = async (req, res) => {
  try {
    const { state, questionId, answer } = req.body;

    const engine = await AdaptiveChiefEngine.fromState(state);
    engine.recordAnswer(questionId, answer);

    const next = await engine.findNextQuestion();

    return res.json({
      state: engine.getState(),
      next,
      done: !next
    });
  } catch (err) {
    console.error("answerAdaptive ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
