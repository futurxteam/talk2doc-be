// routes/symptomRoutes.js
import express from "express";
import {
  matchDiseases,
  nextSymptom,
  finalResults
} from "../controllers/symptomController.js";

const router = express.Router();

// --------------------------------------------------------------
// @desc Match diseases based on selected symptoms
// @route POST /api/symptoms/match
// --------------------------------------------------------------
router.post("/match", matchDiseases);

// --------------------------------------------------------------
// @desc Suggest next symptom or question
// @route POST /api/symptoms/next
// --------------------------------------------------------------
router.post("/next", nextSymptom);

// --------------------------------------------------------------
// @desc Return final ranked results
// @route POST /api/symptoms/final
// --------------------------------------------------------------
router.post("/final", finalResults);

export default router;
