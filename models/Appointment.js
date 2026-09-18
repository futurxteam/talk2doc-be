import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DoctorProfile",
      required: true,
      index: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    date: {
      type: String, // "YYYY-MM-DD"
      required: true,
      index: true,
    },

    timeSlot: {
      type: String, // "09:00-09:30"
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Pending",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },

    paymentMode: {
      type: String,
      enum: ["Online", "Offline"],
      default: "Offline",
    },

    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentResult", // if you have one
    },
  },
  { timestamps: true }
);

/**
 * 🔥 CRITICAL UNIQUE INDEX
 * Prevents double booking even in race conditions
 */
appointmentSchema.index(
  { doctorId: 1, date: 1, timeSlot: 1 },
  { unique: true }
);

export default mongoose.model("Appointment", appointmentSchema);
