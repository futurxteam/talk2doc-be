import express from "express";
import {
  getAvailableSlots,
  bookAppointment,
  myAppointments,
  doctorAppointments,
  updateAppointmentStatus,
  hospitalAppointments
} from "../controllers/appointmentController.js";

import { verifyToken,allowRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/slots", getAvailableSlots);
router.post("/book", verifyToken,allowRoles("PATIENT"),bookAppointment);
router.get("/my-appointments", verifyToken,allowRoles("PATIENT"),myAppointments);
router.get("/doctor-appointments", verifyToken,allowRoles("DOCTOR"),doctorAppointments);
router.get("/hospital-appointments", verifyToken,allowRoles("HOSPITAL"),hospitalAppointments);

router.put("/update-status", verifyToken,allowRoles("DOCTOR","HOSPITAL"),updateAppointmentStatus);
export default router;
