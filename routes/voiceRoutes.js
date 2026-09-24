import express from "express";
import { generateTTS } from "../controllers/voiceController.js";
import {
  createLiveSession,
  handleTranscript,
  handleEmergency,
  handleAssessment,
  findSpecialists,
  selectDoctor,
  bookVoiceAppointment,
  endCall,
  handleSSE,
  getConfig,
} from "../controllers/myDoctorVoiceController.js";

const router = express.Router();

// OpenAI TTS standard endpoint
router.post("/tts", generateTTS);

// MyDoktor / Talk2Doc Voice Line Endpoints
router.get("/config", getConfig);
router.get("/events", handleSSE);
router.post("/session", createLiveSession);
router.post("/transcript", handleTranscript);
router.post("/emergency", handleEmergency);
router.post("/assessment", handleAssessment);
router.post("/find", findSpecialists);
router.post("/select", selectDoctor);
router.post("/book", bookVoiceAppointment);
router.post("/end", endCall);

export default router;
