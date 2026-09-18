// controllers/bodyPartController.js
import BodyPart from "../models/BodyParts.js";

const normalize = (str) => decodeURIComponent(str).trim();

// Convert "headache, pain" → [{label, value}]
const parseSymptoms = (str) => {
  if (!str) return [];
  return str
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(label => ({
      label,
      value: label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    }));
};

// 1. GET /api/body-parts → All primary regions
export const getAllPrimaryRegions = async (req, res) => {
  try {
    const docs = await BodyPart.find().select("name").sort("name");
    res.json(docs.map(d => ({ name: d.name, label: d.name })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// 2. GET /api/body-parts/:region/parts → All sub-parts with symptoms
export const getSubPartsByRegion = async (req, res) => {
  try {
    const region = normalize(req.params.region);
    const doc = await BodyPart.findOne({ name: region });
    if (!doc) return res.status(404).json({ error: "Region not found" });

    const parts = Array.from(doc.part.entries())
      .filter(([key, value]) => value && value.trim())
      .map(([key]) => ({ name: key, label: key }));

    res.json(parts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

// 3. GET /api/body-parts/:region/parts/:subpart/symptoms
export const getSymptomsBySubPart = async (req, res) => {
  try {
    const region = normalize(req.params.region);
    const subpart = normalize(req.params.subpart);

    const doc = await BodyPart.findOne({ name: region });
    if (!doc) return res.status(404).json({ error: "Region not found" });

    const symptomsStr = doc.part.get(subpart);
    if (!symptomsStr) {
      return res.status(404).json({ error: "Sub-part not found or no symptoms" });
    }

    res.json({
      region: doc.name,
      part: subpart,
      symptoms: parseSymptoms(symptomsStr),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};