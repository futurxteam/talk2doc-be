import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";

// Helper to generate OTP (simplified)

/**
 * ===============================
 * ADD DOCTOR (By Hospital)
 * POST /api/hospital/add-doctor
 * Body: { name, phone, specialization, licenseNumber, availability, qualifications, ... }
 * ===============================
 */

export const getDoctorProfileByHospital = async (req, res) => {
  try {
    const hospitalUserId = req.user.id;
    const { doctorId } = req.params;

    const doctor = await DoctorProfile.findOne({
      _id: doctorId,
      hospitalId: hospitalUserId,
    }).populate("user", "name phone email");

    if (!doctor) {
      return res.status(404).json({
        error: "Doctor not found or not authorized",
      });
    }

    res.json({ success: true, doctor });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch doctor profile" });
  }
};


/**
 * ===============================
 * GET DOCTORS (By Hospital)
 * GET /api/hospital/doctors
 * ===============================
 */
export const getHospitalDoctors = async (req, res) => {
    try {
        const hospitalUserId = req.user.id;

        const doctors = await DoctorProfile.find({ hospitalId: hospitalUserId })
            .populate("user", "name phone email");

        res.json({ success: true, count: doctors.length, doctors });
    } catch (err) {
        console.error("Get Doctors Error:", err);
        res.status(500).json({ error: "Failed to fetch doctors" });
    }
};

/**
 * ===============================
 * UPDATE DOCTOR SLOTS
 * PUT /api/hospital/doctor/:doctorId/slots
 * Body: { availability: [...] }
 * ===============================
 */
export const updateDoctorSlots = async (req, res) => {
    try {
        const hospitalUserId = req.user.id;
        const { doctorId } = req.params; // Profile ID or User ID? Let's assume User ID or Profile ID by usage.
        // Usually routes use ID. Let's assume valid DoctorProfile ID or User ID.
        // Robust way: Find DoctorProfile by ID AND hospitalId
        const { availability } = req.body;

        const doctorProfile = await DoctorProfile.findOne({
            _id: doctorId,
            hospitalId: hospitalUserId
        });

        if (!doctorProfile) {
            // Try searching by User ID if ID didn't match Profile ID
            const byUser = await DoctorProfile.findOne({
                user: doctorId,
                hospitalId: hospitalUserId
            });
            if (!byUser) {
                return res.status(404).json({ error: "Doctor not found or not authorized" });
            }
            byUser.availability = availability;
            await byUser.save();
            return res.json({ success: true, message: "Slots updated", doctor: byUser });
        }

        doctorProfile.availability = availability;
        await doctorProfile.save();

        res.json({ success: true, message: "Slots updated", doctor: doctorProfile });
    } catch (err) {
        console.error("Update Slots Error:", err);
        res.status(500).json({ error: "Failed to update slots" });
    }
};
export const createOrUpdateHospitalProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      licenseNumber,
      gstin,
      address,
      latitude,
      longitude,
      contactPhone,
      email,
      website,
      acceptedInsurances, // ✅ NEW
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Location is required" });
    }

    const update = {
      name,
      licenseNumber,
      gstin,
      address,
      contactPhone,
      email,
      website,

      // 📍 GEO
      location: {
        type: "Point",
        coordinates: [Number(longitude), Number(latitude)], // [lng, lat]
      },

      // 🏥 INSURANCE LIST
      acceptedInsurances: Array.isArray(acceptedInsurances)
        ? acceptedInsurances
        : [],
    };

    let profile = await HospitalProfile.findOne({ user: userId });

    if (profile) {
      profile = await HospitalProfile.findOneAndUpdate(
        { user: userId },
        update,
        { new: true }
      );
    } else {
      profile = await HospitalProfile.create({
        user: userId,
        ...update,
      });
    }

    // 🔥🔥🔥 AUTO-SYNC ALL DOCTORS OF THIS HOSPITAL
    await DoctorProfile.updateMany(
      { hospitalId: userId },
      {
        hospitalName: profile.name,
        clinicAddress: profile.address,
        location: profile.location,
      }
    );

    res.json({ success: true, profile });
  } catch (err) {
    console.error("Hospital profile save error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Hospital with this GSTIN or License already exists",
      });
    }

    res.status(500).json({ error: "Failed to save hospital profile" });
  }
};

export const getHospitalProfile = async (req, res) => {
  try {
    const profile = await HospitalProfile
      .findOne({ user: req.user.id })
      .populate("acceptedInsurances", "name"); // ✅ REQUIRED

    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hospital profile" });
  }
};

export const addDoctorByHospital = async (req, res) => {
  try {
    const hospitalUserId = req.user.id;

    const {
      name,
      phone,
      email,
      specialization,
      licenseNumber,
      yearsOfExperience,
      qualifications,
      consultationFee,
      availability,
    } = req.body;

    // 1️⃣ Ensure hospital profile exists
    const hospitalProfile = await HospitalProfile.findOne({ user: hospitalUserId });
    if (!hospitalProfile) {
      return res.status(400).json({ error: "Complete hospital profile first" });
    }

    // 2️⃣ Prevent duplicate login user (phone)
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ error: "User with this phone already exists" });
    }

    // 3️⃣ Prevent duplicate license
    const existingLicense = await DoctorProfile.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(400).json({ error: "Doctor with this license already exists" });
    }

    // 4️⃣ Create Doctor LOGIN user
    const doctorUser = await User.create({
      name,
      phone,
      email,
      role: "DOCTOR",
    });

    // 5️⃣ Create Doctor Profile (COPY from hospital)
    const doctorProfile = await DoctorProfile.create({
      user: doctorUser._id,

      fullName: name,
      specialization,
      licenseNumber,
      yearsOfExperience,
      qualifications: qualifications || [],

      hospitalId: hospitalUserId,
      hospitalName: hospitalProfile.name,
      clinicAddress: hospitalProfile.address,
      location: hospitalProfile.location,

      consultationFee,
      availability,

      phone,
      email,
    });

    res.status(201).json({
      success: true,
      message: "Doctor added successfully",
      doctor: {
        user: doctorUser,
        profile: doctorProfile,
      },
    });
  } catch (err) {
    console.error("Add Doctor Error:", err);

    if (err.code === 11000) {
      return res.status(400).json({
        error: "Duplicate doctor or license or phone",
      });
    }

    res.status(500).json({
      error: "Failed to add doctor",
      details: err.message,
    });
  }
};
