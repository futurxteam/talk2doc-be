import express from 'express';
import {
  getBodyParts,
  triageDecisionTree,
  recommendDepartment
} from '../controllers/departmentController.js';
import { understandSymptoms } from '../controllers/aiTriageController.js';

const router = express.Router();

// GET /api/bodyparts
router.get('/bodyparts', getBodyParts);

// POST /api/triage
router.post('/triage', triageDecisionTree);

// POST /api/recommend
router.post('/recommend', recommendDepartment);

// POST /api/ai/understand-symptoms
router.post('/ai/understand-symptoms', understandSymptoms);

export default router;
