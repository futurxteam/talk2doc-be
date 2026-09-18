import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import AssessmentResult from "../models/Assessment.js";

/**
 * GET /api/user/nearby?lat=..&lng=..&specialty=Cardiology&radius=25&insurance=Star+Health
 * Radius in km (default 50). Insurance filter by name substring.
 */
const SPECIALTY_KEYWORDS = {
  cardiology: ["cardio", "heart"],
  neurology: ["neuro"],
  orthopedics: ["ortho", "bone", "joint", "spine"],
  gastroenterology: ["gastro", "digest", "gi", "liver"],
  pulmonology: ["pulmon", "respirat", "chest", "lung"],
  dermatology: ["derma", "skin"],
  ent: ["ent", "otolaryngol", "ear", "throat"],
  ophthalmology: ["ophthalm", "eye", "vision"],
  urology: ["uro", "kidney", "bladder"],
  gynecology: ["gynec", "obgyn", "women"],
  pediatrics: ["pediatric", "child"],
  psychiatry: ["psychiat", "mental"],
  "general medicine": ["general", "medicine", "internal", "physician", "primary", "family", "mbbs"],
};

function getSpecialtyRegex(dept) {
  if (!dept) return null;
  const lower = dept.toLowerCase();
  for (const [key, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (lower.includes(key) || keywords.some(k => lower.includes(k))) {
      return new RegExp(keywords.join("|"), "i");
    }
  }
  const tokens = lower.replace(/[()[\]{}/\\.,-]/g, " ").split(/\s+/).filter(t => t.length >= 3);
  if (tokens.length > 0) return new RegExp(tokens.join("|"), "i");
  return new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export const getNearbyDoctors = async (req, res) => {
  try {
    const { lat, lng, specialty, radius, insurance } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    // Radius in km, clamped 1–100, default 50
    const radiusKm = Math.min(Math.max(Number(radius) || 50, 1), 100);
    const maxDistanceMeters = radiusKm * 1000;

    const buildPipeline = (specRegex) => {
      const p = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
            distanceField: "distance",
            maxDistance: maxDistanceMeters,
            spherical: true,
          },
        },
        // Populate accepted insurance provider names
        {
          $lookup: {
            from: "insuranceproviders",
            localField: "acceptedInsurances",
            foreignField: "_id",
            as: "insuranceDetails",
          },
        },
        // Join doctors via hospital user ID
        {
          $lookup: {
            from: "doctorprofiles",
            localField: "user",
            foreignField: "hospitalId",
            as: "doctors",
          },
        },
        { $unwind: "$doctors" },
      ];

      if (specRegex) {
        p.push({ $match: { "doctors.specialization": { $regex: specRegex } } });
      }
      return p;
    };

    let specRegex = specialty ? getSpecialtyRegex(specialty) : null;
    let results = await HospitalProfile.aggregate(buildPipeline(specRegex));
    let isFallback = false;
    let fallbackMessage = null;

    // Fallback to General Medicine when no specialist found
    if (results.length === 0 && specialty && !/general|primary/i.test(specialty)) {
      const genMedRegex = new RegExp(SPECIALTY_KEYWORDS["general medicine"].join("|"), "i");
      results = await HospitalProfile.aggregate(buildPipeline(genMedRegex));
      if (results.length > 0) {
        isFallback = true;
        fallbackMessage = `No direct ${specialty} specialists found within ${radiusKm} km. Showing nearby General Physicians who provide preliminary evaluation and direct hospital referrals.`;
      }
    }

    // Apply insurance name filter
    let filteredResults = results;
    if (insurance && insurance.trim() !== "" && insurance.toLowerCase() !== "all") {
      const insLower = insurance.toLowerCase();
      filteredResults = results.filter((r) => {
        const names = (r.insuranceDetails || []).map((ins) => ins.name.toLowerCase());
        return names.some((n) => n.includes(insLower));
      });
    }

    const groups = { "0-5": [], "5-10": [], "10-15": [], "15-50": [] };
    let totalFound = 0;

    for (const r of filteredResults) {
      const km = r.distance / 1000;
      totalFound++;

      const doc = {
        _id: r.doctors._id,
        fullName: r.doctors.fullName,
        specialization: r.doctors.specialization,
        yearsOfExperience: r.doctors.yearsOfExperience || 0,
        consultationFee: r.doctors.consultationFee || 0,
        availability: r.doctors.availability || "",
        workingHours: r.doctors.workingHours || { start: "09:00", end: "17:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
        phone: r.doctors.phone || r.contactPhone || "",
        hospitalName: r.name,
        hospitalAddress: r.address || "",
        distanceKm: km.toFixed(1),
        acceptedInsurances: (r.insuranceDetails || []).map((ins) => ins.name),
      };

      if (km <= 5) groups["0-5"].push(doc);
      else if (km <= 10) groups["5-10"].push(doc);
      else if (km <= 15) groups["10-15"].push(doc);
      else groups["15-50"].push(doc);
    }

    res.json({ success: true, totalCount: totalFound, specialty: specialty || "All", radiusKm, isFallback, fallbackMessage, groups });
  } catch (err) {
    console.error("Nearby doctors error:", err);
    res.status(500).json({ error: "Failed to find nearby doctors" });
  }
};

export const saveAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { emergency, emergencyReason, recommendation, results, collected, activeSyndromes } = req.body;

    const assessment = await AssessmentResult.create({
      user: userId,
      emergency,
      emergencyReason,
      recommendation,
      results,
      collected,
      activeSyndromes,
    });

    res.json({ success: true, assessmentId: assessment._id });
  } catch (err) {
    console.error("Save assessment error:", err);
    res.status(500).json({ error: "Failed to save assessment" });
  }
};

/**
 * GET /api/assessments/my
 * Get all assessments of logged in user
 */
export const getMyAssessments = async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await AssessmentResult.find({ user: userId }).sort({ createdAt: -1 });
    res.json({ success: true, count: list.length, assessments: list });
  } catch (err) {
    console.error("Get assessments error:", err);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
};
