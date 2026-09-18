import express from "express";
import { startAdaptive, answerAdaptive } from "../controllers/adaptiveGuidedController.js";

const router = express.Router();
router.post("/start", startAdaptive);
router.post("/answer", answerAdaptive);

export default router;