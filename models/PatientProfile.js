import mongoose from "mongoose";

const patientProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per user
    },

    // Basic info
    fullName: String,
    age: Number,
    gender: String,

    // Body info
    height: Number,
    weight: Number,
    bloodGroup: String,

    // Medical info
    allergies: [String],
    chronicDiseases: [String],
    medications: [String],
    // Insurance
insuranceProvider: String,


    // Emergency
    emergencyContactName: String,
    emergencyContactPhone: String,
  },
  { timestamps: true }
);

export default mongoose.model("PatientProfile", patientProfileSchema);
