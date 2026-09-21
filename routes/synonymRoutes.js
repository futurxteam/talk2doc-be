import express from 'express';
import {
  getAllSynonyms,
  learnSynonym
} from '../controllers/synonymController.js';

const router = express.Router();

// GET /api/synonyms - fetch cached dictionary of synonyms
router.get('/', getAllSynonyms);

// POST /api/synonyms/learn - auto-learn or add new synonym
router.post('/learn', learnSynonym);

export default router;
