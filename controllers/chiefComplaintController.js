// controllers/chiefComplaintController.js
import ChiefComplaint from "../models/chiefComplaint.js";

/**
 * GET /api/cc/bodyparts
 * Returns:
 * [
 *   { body_part: "lower abdomen / pelvis", complaints: ["watery diarrhea", "vomiting", ...] },
 *   { body_part: "chest", complaints: ["persistent cough", "night sweats", ...] },
 *   ...
 * ]
 */
export const getBodyPartsWithComplaints = async (req, res) => {
  try {
    const all = await ChiefComplaint.find().lean();

    // Use a Map to preserve original casing from DB (optional: you can normalize if you want)
    const map = new Map();

    all.forEach((doc) => {
      const complaintName = doc.name;

      (doc.body_parts || []).forEach((bp) => {
        const normalizedBp = bp.toLowerCase().trim(); // keep lowercase for grouping
        const originalBp = bp.trim();                 // keep original for display

        if (!map.has(normalizedBp)) {
          map.set(normalizedBp, { original: originalBp, complaints: new Set() });
        }
        map.get(normalizedBp).complaints.add(complaintName);
      });
    });

    const result = Array.from(map.values()).map(({ original, complaints }) => ({
      body_part: original,
      complaints: Array.from(complaints).sort(), // optional alphabetical sort
    }));

    return res.json(result);
  } catch (err) {
    console.error("getBodyPartsWithComplaints ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * GET /api/cc/by-bodypart/:bodyPart
 * Accepts both exact match and case-insensitive match
 * Returns:
 * [
 *   { id, name, label, questions: [...] },
 *   ...
 * ]
 */
export const getComplaintsByBodyPart = async (req, res) => {
  try {
    // Support multiple param styles: /:bodyPart, /:bp, or direct path
    let bodyPart = req.params.bodyPart || req.params.bp || req.params[0] || "";

    if (!bodyPart) {
      return res.status(400).json({ error: "Missing body part parameter" });
    }

    bodyPart = bodyPart.trim();

    // Find complaints where body_parts array contains the requested part (case-insensitive)
    const complaints = await ChiefComplaint.find({
      body_parts: { $regex: new RegExp("^" + bodyPart.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "$", "i") },
    }).lean();

    if (complaints.length === 0) {
      return res.status(404).json({ message: "No chief complaints found for this body part" });
    }

    const formatted = complaints.map((item) => ({
      id: item._id.toString(),
      name: item.name,
      label: item.name,
      questions: item.questions || [],
    }));

    return res.json({ chiefComplaints: formatted });
  } catch (err) {
    console.error("getComplaintsByBodyPart ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};