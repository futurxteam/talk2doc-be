// routes/chiefComplaintRoutes.js
import express from "express";
import {
  getBodyPartsWithComplaints,
  getComplaintsByBodyPart,
} from "../controllers/chiefComplaintController.js";

const router = express.Router();
router.get("/", getBodyPartsWithComplaints);
router.get("/:bodyPart", getComplaintsByBodyPart);
export default router;
