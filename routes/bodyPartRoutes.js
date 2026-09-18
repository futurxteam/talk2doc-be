// routes/bodyParts.js
import express from "express";
import {
  getAllPrimaryRegions,
  getSubPartsByRegion,
  getSymptomsBySubPart,
} from "../controllers/bodyPartController.js";

const router = express.Router();

router.get("/", getAllPrimaryRegions);
router.get("/:region/parts", getSubPartsByRegion);
router.get("/:region/parts/:subpart/symptoms", getSymptomsBySubPart);

export default router;