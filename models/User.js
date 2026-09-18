import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },

    role: {
      type: String,
      enum: ["PATIENT", "DOCTOR", "ADMIN", "HOSPITAL"],
      default: "PATIENT",
    },

    gender: String,
    insuranceNo: String,
    height: Number,
    weight: Number,

    otp: String,
    otpExpiresAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
