// models/Disease.js — FINAL PRODUCTION VERSION
import mongoose from "mongoose";

const DiseaseSchema = new mongoose.Schema(
  {
    icd: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Infectious",
        "Gastrointestinal",
        "Neurological",
        "Respiratory",
        "Cardiovascular",
        "Hematological",
        "Dermatological",
        "Rheumatological",
        "Endocrine",
        "Renal",
        "Other",
      ],
      default: "Other",
    },

    // Body mapping
    primary_region: { type: String, required: true },
    affected_parts: [{ type: String }],

    // Core symptoms
    symptoms: [
      {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
    ],
    important_symptoms: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
clinical_features: [
  {
    type: String,
    lowercase: true,
    trim: true,
  },
],

    // Epidemiology
    prevalence: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 100,
    },

    age_groups: {
      type: Map,
      of: {
        type: Number,
        min: 0.1,
        max: 10,
      },
      default: () =>
        new Map([
          ["0-4", 1],
          ["5-14", 1],
          ["15-24", 1],
          ["25-44", 1],
          ["45-64", 1],
          ["65+", 1],
        ]),
    },

    sex_bias: {
      male: { type: Number, default: 1, min: 0.1, max: 10 },
      female: { type: Number, default: 1, min: 0.1, max: 10 },
    },

    // Weighted contributors
    risk_factors: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },

    modifiers: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },

    // Optional: for future use (severity, contagiousness, etc.)
    severity_level: { type: Number, min: 1, max: 5 }, // 5 = life-threatening
    is_notifiable: { type: Boolean, default: false }, // IDSP/WHO notifiable
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance (critical for scoring 1000s of diseases)
DiseaseSchema.index({ primary_region: 1 });
DiseaseSchema.index({ symptoms: 1 });
DiseaseSchema.index({ icd: 1 });
DiseaseSchema.index({ category: 1 });
DiseaseSchema.index({ "important_symptoms": 1 });

// Virtual for full name
DiseaseSchema.virtual("displayName").get(function () {
  return `${this.name} (${this.icd})`;
});

export default mongoose.models.Disease || mongoose.model("Disease", DiseaseSchema);