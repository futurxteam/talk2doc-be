import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";

// Clinical specialty mappings to ensure flexible matching between department names and doctor titles
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

  // Check if any mapped specialty keyword matches the input department
  for (const [key, keywords] of Object.entries(SPECIALTY_KEYWORDS)) {
    if (lower.includes(key) || keywords.some(k => lower.includes(k))) {
      return new RegExp(keywords.join("|"), "i");
    }
  }

  // Fallback: strip punctuation like parentheses, slashes, etc. and match any token with 3+ letters
  const tokens = lower
    .replace(/[()[\]{}/\\.,-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3);

  if (tokens.length > 0) {
    return new RegExp(tokens.join("|"), "i");
  }

  return new RegExp(lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/**
 * GET /api/triage/doctors?department=Cardiology
 * Returns list of doctors matching the department/specialization,
 * with fallback to General Medicine if direct specialist is not found.
 */
export const getDoctorsByDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};
    let isFallback = false;
    let fallbackMessage = null;

    if (department && department.trim() !== "") {
      const specRegex = getSpecialtyRegex(department.trim());
      if (specRegex) {
        query.specialization = { $regex: specRegex };
      }
    }

    let doctors = await DoctorProfile.find(query)
      .populate("user", "name email profilePicture")
      .lean();

    // If no direct specialists found for this specific specialty, fallback to General Medicine
    if (doctors.length === 0 && department && !/general|primary/i.test(department)) {
      const genMedRegex = new RegExp(SPECIALTY_KEYWORDS["general medicine"].join("|"), "i");
      doctors = await DoctorProfile.find({ specialization: { $regex: genMedRegex } })
        .populate("user", "name email profilePicture")
        .lean();

      if (doctors.length > 0) {
        isFallback = true;
        fallbackMessage = `No direct specialist currently listed under ${department}. Showing verified General Physicians who provide initial triage, physical evaluation, and clinical referrals.`;
      }
    }

    // Populate hospital profiles (using hospital.name)
    const populatedDoctors = await Promise.all(
      doctors.map(async (doc) => {
        let hospital = null;
        if (doc.hospitalId) {
          hospital = await HospitalProfile.findOne({ user: doc.hospitalId }).lean();
        }
        return {
          ...doc,
          hospitalName: hospital ? hospital.name : doc.hospitalName || "Partner Hospital",
          hospitalAddress: hospital ? hospital.address : doc.hospitalAddress || "",
          hospitalPhone: hospital ? hospital.contactPhone : "",
        };
      })
    );

    res.status(200).json({
      success: true,
      count: populatedDoctors.length,
      department: department || "All",
      isFallback,
      fallbackMessage,
      doctors: populatedDoctors,
    });
  } catch (error) {
    console.error("[ERROR] getDoctorsByDepartment:", error);
    res.status(500).json({ success: false, error: "Failed to fetch doctors for department" });
  }
};
