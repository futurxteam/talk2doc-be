import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import Assessment from "../models/Assessment.js";
import User from "../models/User.js";
import HospitalProfile from "../models/HospitalProfile.js";
/**
 * ===============================
 * PATIENT PROFILE
 * ===============================
 */

// Get patient profile
export const getPatientProfile = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;

    let profile = await PatientProfile.findOne({ user: userId }).populate(
      "user",
      "name phone email role"
    );

    // ✅ If profile does not exist, CREATE EMPTY ONE
    if (!profile) {
      profile = await PatientProfile.create({
        user: userId,
        fullName: "",
        age: "",
        gender: "",
        height: "",
        weight: "",
        bloodGroup: "",
        allergies: [],
        chronicDiseases: [],
        medications: [],
        emergencyContactName: "",
        emergencyContactPhone: "",
        insuranceProvider: "",
      });

      profile = await profile.populate("user", "name phone email role");
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error("Get patient profile error:", err);
    res.status(500).json({ error: "Failed to fetch patient profile" });
  }
};


// Create or update patient profile
export const createOrUpdatePatientProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    const {
      fullName,
      age,
      gender,
      height,
      weight,
      bloodGroup,
      allergies,
      chronicDiseases,
      medications,
      emergencyContactName,
      emergencyContactPhone,
      insuranceProvider, // ✅ NEW
    } = req.body;

    let profile = await PatientProfile.findOne({ user: userId });

    if (profile) {
      // ✅ Update only fields that are actually sent
      if (fullName !== undefined) profile.fullName = fullName;
      if (age !== undefined) profile.age = age;
      if (gender !== undefined) profile.gender = gender;
      if (height !== undefined) profile.height = height;
      if (weight !== undefined) profile.weight = weight;
      if (bloodGroup !== undefined) profile.bloodGroup = bloodGroup;
      if (allergies !== undefined) profile.allergies = allergies;
      if (chronicDiseases !== undefined) profile.chronicDiseases = chronicDiseases;
      if (medications !== undefined) profile.medications = medications;
      if (emergencyContactName !== undefined)
        profile.emergencyContactName = emergencyContactName;
      if (emergencyContactPhone !== undefined)
        profile.emergencyContactPhone = emergencyContactPhone;
      if (insuranceProvider !== undefined)
        profile.insuranceProvider = insuranceProvider; // ✅ NEW

      await profile.save();
    } else {
      // ✅ Create new profile
      profile = await PatientProfile.create({
        user: userId,
        fullName,
        age,
        gender,
        height,
        weight,
        bloodGroup,
        allergies,
        chronicDiseases,
        medications,
        emergencyContactName,
        emergencyContactPhone,
        insuranceProvider, // ✅ NEW
      });
    }

    res.json({
      success: true,
      message: "Patient profile saved successfully",
      profile,
    });
  } catch (err) {
    console.error("Save patient profile error:", err);
    res.status(500).json({ error: "Failed to save patient profile" });
  }
};

/**
 * ===============================
 * DOCTOR PROFILE
 * ===============================
 */

// Get doctor profile
export const createOrUpdateDoctorProfile = async (req, res) => {
  try {
    const userId = req.user.id; // doctor user

    const {
      fullName,
      specialization,
      licenseNumber,
      yearsOfExperience,
      qualifications,
      bio,
      languages,
      consultationFee,
      availability,
      phone,
      email,

      // 🆕 NEW FIELDS
      workingHours,
      slotDuration,
    } = req.body;

    // 1️⃣ Find existing doctor profile
    let doctor = await DoctorProfile.findOne({ user: userId });

    if (!doctor) {
      return res.status(404).json({
        error: "Doctor profile not found. Contact hospital admin.",
      });
    }

    // 2️⃣ Load hospital profile (source of truth)
    const hospital = await HospitalProfile.findOne({
      user: doctor.hospitalId,
    });

    if (!hospital) {
      return res.status(400).json({
        error: "Hospital profile not found",
      });
    }

    // 3️⃣ Update ONLY allowed fields
    doctor.fullName = fullName;
    doctor.specialization = specialization;
    doctor.licenseNumber = licenseNumber;
    doctor.yearsOfExperience = yearsOfExperience;
    doctor.qualifications = qualifications || [];
    doctor.bio = bio;
    doctor.languages = languages || [];
    doctor.consultationFee = consultationFee;
    doctor.availability = availability;
    doctor.phone = phone;
    doctor.email = email;

    // 🆕 SLOT SYSTEM FIELDS
    if (workingHours) {
      doctor.workingHours = {
        start: workingHours.start || doctor.workingHours?.start || "09:00",
        end: workingHours.end || doctor.workingHours?.end || "17:00",
        days:
          workingHours.days && workingHours.days.length > 0
            ? workingHours.days
            : doctor.workingHours?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"],
      };
    }

    if (slotDuration) {
      doctor.slotDuration = Number(slotDuration);
    }

    // 4️⃣ 🔒 FORCE sync hospital data
    doctor.hospitalName = hospital.name;
    doctor.clinicAddress = hospital.address;
    doctor.location = hospital.location;

    await doctor.save();

    res.json({
      success: true,
      message: "Doctor profile updated",
      profile: doctor,
    });
  } catch (err) {
    console.error("Doctor profile update error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Duplicate license number",
      });
    }

    res.status(500).json({
      error: "Failed to update doctor profile",
    });
  }
};


export const getMyDoctorProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await DoctorProfile.findOne({ user: userId });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

export const saveAssessment = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware

    const {
      emergency,
      emergencyReason,
      recommendation,
      results,
      collected,
      activeSyndromes,
      department,
      alternativeDepartment,
      urgencyLevel,
      primarySymptom,
      bodyArea,
      duration,
      severity,
      reportType,
      reportData,
    } = req.body;

    const assessment = await Assessment.create({
      user: userId,
      emergency,
      emergencyReason,
      recommendation,
      results,
      collected,
      activeSyndromes,
      department,
      alternativeDepartment,
      urgencyLevel,
      primarySymptom,
      bodyArea,
      duration,
      severity,
      reportType: reportType || "TRIAGE_EVALUATION",
      reportData,
    });

    res.json({
      success: true,
      assessmentId: assessment._id,
    });
  } catch (err) {
    console.error("Save assessment error:", err);
    res.status(500).json({ error: "Failed to save assessment" });
  }
};
