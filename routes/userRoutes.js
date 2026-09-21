import express from "express";
import { verifyToken, allowRoles } from "../middleware/authMiddleware.js";
import { getUserProfile } from "../controllers/userController.js";
import { getNearbyDoctors, getMyAssessments } from "../controllers/patientProfileController.js";
import { saveAssessment } from "../controllers/profileController.js";
const router = express.Router();

// Protected route — requires token
router.get("/profile", verifyToken, getUserProfile);
router.get("/nearby", getNearbyDoctors);
router.get("/doctors/nearby", getNearbyDoctors);//need change test only
router.post("/save", verifyToken, saveAssessment)//need change test only

router.get(
  "/assessments/my",
  verifyToken,
  allowRoles("PATIENT"),
  getMyAssessments
);
export default router;
