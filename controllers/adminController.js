import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";
import mongoose from "mongoose";


/**
 * ===============================
 * ADMIN CONTROLLERS
 * ===============================
 */

// Get all patients with their profiles
export const getAllPatients = async (req, res) => {
    try {
        const patients = await User.find({ role: "PATIENT" }).select(
            "-otp -otpExpiresAt"
        );

        // Fetch profiles for each patient
        const patientsWithProfiles = await Promise.all(
            patients.map(async (patient) => {
                const profile = await PatientProfile.findOne({
                    user: patient._id,
                }).lean();
                return {
                    user: patient.toObject(),
                    profile: profile || null,
                };
            })
        );

        res.json({
            success: true,
            count: patientsWithProfiles.length,
            patients: patientsWithProfiles,
        });
    } catch (err) {
        console.error("Get all patients error:", err);
        res.status(500).json({ error: "Failed to fetch patients" });
    }
};

// Get all doctors with their profiles
export const getAllDoctors = async (req, res) => {
    try {
        const doctors = await User.find({ role: "DOCTOR" }).select(
            "-otp -otpExpiresAt"
        );

        // Fetch profiles for each doctor
        const doctorsWithProfiles = await Promise.all(
            doctors.map(async (doctor) => {
                const profile = await DoctorProfile.findOne({
                    user: doctor._id,
                }).lean();
                return {
                    user: doctor.toObject(),
                    profile: profile || null,
                };
            })
        );

        res.json({
            success: true,
            count: doctorsWithProfiles.length,
            doctors: doctorsWithProfiles,
        });
    } catch (err) {
        console.error("Get all doctors error:", err);
        res.status(500).json({ error: "Failed to fetch doctors" });
    }
};

// Get user statistics

// controllers/admin.controller.js (or wherever getUserStats is)

export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const totalPatients = await User.countDocuments({ role: "PATIENT" });
    const totalDoctors = await User.countDocuments({ role: "DOCTOR" });
    const totalHospitals = await User.countDocuments({ role: "HOSPITAL" });

    // Profile counts
    const patientProfiles = await PatientProfile.countDocuments();
    const doctorProfiles = await DoctorProfile.countDocuments();
    const hospitalProfiles = await HospitalProfile.countDocuments();

    res.json({
      success: true,
      stats: {
        totalUsers,

        totalPatients,
        patientProfiles,

        totalDoctors,
        doctorProfiles,

        totalHospitals,
        hospitalProfiles,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats" });
  }
};

export const createDoctorUser = async (req, res) => {
    try {
        const { name, phone } = req.body;

        // Validation
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name and phone are required",
            });
        }

        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this phone number already exists",
            });
        }

        // Create doctor user
        const doctor = await User.create({
            name,
            phone,
            role: "DOCTOR",
        });

        res.status(201).json({
            success: true,
            message: "Doctor user created successfully",
            doctor,
        });
    } catch (err) {
        console.error("Create doctor error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to create doctor user",
        });
    }
};

export const createHospitalUser = async (req, res) => {
    try {
        const { name, phone } = req.body;

        // Validation
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name and phone are required",
            });
        }

        // Check if phone already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User with this phone number already exists",
            });
        }

        // Create HOSPITAL user
        const hospitalUser = await User.create({
            name,
            phone,
            role: "HOSPITAL",
        });

        // Create Profile Stub
        const HospitalProfile = (await import("../models/HospitalProfile.js")).default;
        await HospitalProfile.create({
            user: hospitalUser._id,
            name: name,
            licenseNumber: "PENDING-" + hospitalUser._id,
            address: "PENDING",
            email: "PENDING",
            location: { type: "Point", coordinates: [0, 0] }
        });

        res.status(201).json({
            success: true,
            message: "Hospital user created successfully",
            hospital: hospitalUser,
        });
    } catch (err) {
        console.error("Create hospital error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to create hospital user",
        });
    }
};
export const getPatientsPaginated = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // 1️⃣ Find only PATIENT users matching search
    const userQuery = {
      role: "PATIENT",
      ...(search
        ? {
            $or: [
              { name: { $regex: search, $options: "i" } },
              { phone: { $regex: search, $options: "i" } },
            ],
          }
        : {}),
    };

    const users = await User.find(userQuery).select("_id").lean();

    const userIds = users.map(u => u._id);

    // 2️⃣ Query patient profiles only for those users
    const query = {
      user: { $in: userIds },
    };

    const total = await PatientProfile.countDocuments(query);

    const patients = await PatientProfile.find(query)
      .populate("user", "name phone role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      patients,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error("getPatientsPaginated error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch patients" });
  }
};


export const getHospitalsPaginated = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search || "";

  const filter = search
    ? { name: { $regex: search, $options: "i" } }
    : {};

  const skip = (page - 1) * limit;

  const total = await HospitalProfile.countDocuments(filter);

  const hospitals = await HospitalProfile
    .find(filter)
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    hospitals,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
};


export const getDoctorsByHospitalPaginated = async (req, res) => {
  try {
    const { hospitalId } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";

    if (!hospitalId) {
      return res.status(400).json({ success: false, message: "hospitalId is required" });
    }

    const filter = {
      hospitalId: new mongoose.Types.ObjectId(hospitalId), // ✅ FIX
      ...(search && {
        fullName: { $regex: search, $options: "i" },
      }),
    };

    const skip = (page - 1) * limit;

    const total = await DoctorProfile.countDocuments(filter);

    const doctors = await DoctorProfile
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ fullName: 1 });

    res.json({
      success: true,
      doctors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (err) {
    console.error("Doctor by hospital error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAdminPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await PatientProfile
      .findById(id)
      .populate("user"); // get name, phone, etc

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json({
      success: true,
      patient,
    });
  } catch (err) {
    console.error("getAdminPatientById error:", err);
    res.status(500).json({ error: "Failed to load patient profile" });
  }
};


export const getHospitalByIdAdmin = async (req, res) => {
  const hospital = await HospitalProfile.findById(req.params.id)
    .populate("acceptedInsurances", "name");

  if (!hospital) {
    return res.status(404).json({ success: false, message: "Hospital not found" });
  }

  res.json({ success: true, hospital });
};


export const getAdminDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await DoctorProfile.findById(id)
      .populate("user", "name phone email");

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    res.json({
      success: true,
      doctor,
    });

  } catch (err) {
    console.error("Get doctor detail error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
