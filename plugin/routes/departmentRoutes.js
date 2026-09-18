import express from 'express';
import {
  getBodyParts,
  triageDecisionTree,
  recommendDepartment
} from '../controllers/departmentController.js';

const router = express.Router();

// GET /api/bodyparts
router.get('/bodyparts', getBodyParts);

// POST /api/triage
router.post('/triage', triageDecisionTree);

// POST /api/recommend
router.post('/recommend', recommendDepartment);

export default router;
