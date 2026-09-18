// models/DoctorProfile.js
import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Doctor info
    fullName: { type: String, required: true },
    specialization: { type: String, required: true },

    yearsOfExperience: { type: Number, default: 0 },

    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },

    qualifications: [{ type: String }],

    bio: { type: String },
    languages: [{ type: String }],

    consultationFee: { type: Number, default: 0 },

    availability: { type: String },

    phone: { type: String },
    email: { type: String },


    // 🕒 Working hours for slot generation
workingHours: {
  start: { type: String, default: "09:00" }, // "09:00"
  end: { type: String, default: "17:00" },   // "17:00"
  days: {
    type: [String], // ["Mon","Tue","Wed","Thu","Fri"]
    default: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  },
},

// ⏱️ Slot duration in minutes
slotDuration: {
  type: Number,
  default: 30,
},

    // 🔗 Hospital link
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or "HospitalProfile" if you change it
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);



export default mongoose.model("DoctorProfile", doctorProfileSchema);
