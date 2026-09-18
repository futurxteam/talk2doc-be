import express from "express";
import {
    getPatientProfile,
    createOrUpdatePatientProfile,
     getMyDoctorProfile, createOrUpdateDoctorProfile 
} from "../controllers/profileController.js";
import { allowRoles, verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Doctor profile routes (SELF)
router.get(
  "/doctor/me",
  verifyToken,
  allowRoles("DOCTOR"),
  getMyDoctorProfile
);

router.post(
  "/doctor/me",
  verifyToken,
  allowRoles("DOCTOR"),
  createOrUpdateDoctorProfile
);


// Patient profile routes (SELF)
router.get(
  "/patient/me",
  verifyToken,
  allowRoles("PATIENT"),
  getPatientProfile
);

router.post(
  "/patient/me",
  verifyToken,
  allowRoles("PATIENT"),
  createOrUpdatePatientProfile
);

export default router;
