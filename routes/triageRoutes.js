import express from "express";
import { getDoctorsByDepartment } from "../controllers/triageController.js";

const router = express.Router();

// GET /api/triage/doctors?department=Cardiology
router.get("/doctors", getDoctorsByDepartment);

export default router;
