import jwt from "jsonwebtoken";
import User from "../models/User.js";
import PatientProfile from "../models/PatientProfile.js";
import HospitalProfile from "../models/HospitalProfile.js";

const SECRET = process.env.JWT_SECRET || "secretkey";

// 🔢 FIXED OTP FOR NOW
const FIXED_OTP = "123";

/**
 * ===============================
 * SIGNUP → create user + "send" OTP
 * POST /api/auth/signup
 * ===============================
 */
export const signup = async (req, res) => {
  try {
    const {
      name,
      phone,
      role = "PATIENT",
      gender,
      insuranceNo,
      height,
      weight,
    } = req.body;

    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const existing = await User.findOne({ phone });
    if (existing)
      return res.status(400).json({ error: "Account already exists. Please login." });

    const user = await User.create({
      name,
      phone,
      role,
      gender,
      insuranceNo,
      height,
      weight,
      otp: FIXED_OTP,
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Create Profile Stub based on Role
    if (role === "PATIENT") {
      await PatientProfile.create({ user: user._id, fullName: name });
    } else if (role === "HOSPITAL") {
      await HospitalProfile.create({
        user: user._id,
        name: name,
        licenseNumber: "PENDING-" + user._id, // Placeholder
        address: "PENDING",
        email: "PENDING",
        location: { type: "Point", coordinates: [0, 0] }
      });
    }
    // Doctor profiles are usually created by Hospitals, but if a Doctor signs up independently (optional flow), we might handle it here or block it.
    // For now, assuming Doctors are added by Hospitals via a separate API, OR they sign up and get a profile later.
    // But the prompt says "hospitals can insert...". So independent Doctor signup might not be primary. 
    // However, if they DO signup, we might want a stub.


    console.log("📨 Signup OTP (DEV):", FIXED_OTP);

    res.json({
      success: true,
      message: "Signup successful. OTP sent to WhatsApp (use 123).",
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
};

/**
 * ===============================
 * LOGIN → send OTP only
 * POST /api/auth/login
 * ===============================
 */
export const login = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const user = await User.findOne({ phone });
    if (!user)
      return res.status(404).json({ error: "No account found. Please signup." });

    user.otp = FIXED_OTP;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    console.log("📨 Login OTP (DEV):", FIXED_OTP);

    res.json({
      success: true,
      message: "OTP sent to WhatsApp (use 123).",
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

/**
 * ===============================
 * VERIFY OTP → issue JWT
 * POST /api/auth/verify-otp
 * ===============================
 */
export const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp)
      return res.status(400).json({ error: "Phone and OTP required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.otp || !user.otpExpiresAt)
      return res.status(400).json({ error: "No OTP requested" });

    if (otp !== FIXED_OTP)
      return res.status(400).json({ error: "Invalid OTP (use 123)" });

    if (user.otpExpiresAt < new Date())
      return res.status(400).json({ error: "OTP expired" });

    // Clear OTP
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
};
