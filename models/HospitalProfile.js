import mongoose from "mongoose";

const hospitalProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      unique: true,
    },
    gstin: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },

    // 📍 GEO LOCATION
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined,
      },
    },

    contactPhone: String,
    email: String,
    website: String,

    // 🏥 ACCEPTED INSURANCES
    acceptedInsurances: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InsuranceProvider",
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Geo index
hospitalProfileSchema.index({ location: "2dsphere" });

export default mongoose.model("HospitalProfile", hospitalProfileSchema);
