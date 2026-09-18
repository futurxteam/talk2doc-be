import express from "express";
import {   updateDoctorSlots,createOrUpdateHospitalProfile,
  getHospitalProfile,addDoctorByHospital,getHospitalDoctors,
  getDoctorProfileByHospital } from "../controllers/hospitalController.js";
import { verifyToken,allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes protected
router.use(verifyToken);

// Add Doctor

// Get All Doctors under this Hospital

// Update Time Slots
router.put("/doctor/:doctorId/slots",verifyToken,allowRoles("HOSPITAL"), updateDoctorSlots);

router.get("/profile",verifyToken,allowRoles("HOSPITAL"),  getHospitalProfile);
router.post("/profile",verifyToken,allowRoles("HOSPITAL"),  createOrUpdateHospitalProfile);
    
router.post(
  "/add-doctor",
  verifyToken,
  allowRoles("HOSPITAL"),
  addDoctorByHospital
);

// Get All Doctors under this Hospital
router.get(
  "/doctors",
  verifyToken,
  allowRoles("HOSPITAL"),
  getHospitalDoctors
);

// Get One Doctor (optional)
router.get(
  "/doctor/:doctorId",
  verifyToken,
  allowRoles("HOSPITAL"),
  getDoctorProfileByHospital
);

export default router;
 