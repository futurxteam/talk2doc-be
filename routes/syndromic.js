// routes/syndromic.js
import express from "express";
import { startSyndromic, answerSyndromic, getSessionStatus,matchDisease  } from "../controllers/syndromicController.js";

const router = express.Router();

router.post("/start", startSyndromic);
router.post("/answer", answerSyndromic);
router.get("/status/:sessionId", getSessionStatus);
router.post("/match", matchDisease);
export default router;