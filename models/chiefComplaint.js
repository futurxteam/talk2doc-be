// models/chiefComplaint.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["mcq", "yesno", "text", "single_choice"],
      default: "mcq",
    },
    rank: { type: Number, default: 99 },
    options: [
      {
        value: { type: String, required: true },
        description: String,
      },
    ],
    depends_on: {
      question_id: String,
      required_value: [String],
    },
    is_modifier: { type: Boolean, default: false },
    is_habit: { type: Boolean, default: false },
    is_risk_factor: { type: Boolean, default: false },
  },
  { _id: false }
);

const bodyPartSchema = new mongoose.Schema(
  {
    // Canonical primary region(s) — usually just one, but allows multiple if needed
    name: {
      type: [String],
      required: true,
      enum: [
        "Head & Neck",
        "Chest",
        "Upper Abdomen",
        "Lower Abdomen / Pelvis",
        "Back & Spine",
        "Upper Limb",
        "Lower Limb",
        "Genitals & Groin",
        "Buttocks & Rectal Area",
        "Body Systems",
        "Whole Body",
        "Systemic / Whole Body",   // ← NEW: Your preferred canonical name
        "Skin",                    // ← Added as requested earlier
      ],
    },

    // All fine-grained or related sub-parts (for display, search, legacy mapping)
    sub_regions: [
      {
        type: String,
        enum: [
          // All detailed parts from our master list + systems
          "Scalp", "Forehead", "Head", "Face", "Eyes", "Ears", "Nose", "Mouth", "Tongue", "Jaw",
          "Throat", "Neck", "Chest", "Lungs", "Heart", "Breast", "Upper abdomen", "Right upper abdomen",
          "Left upper abdomen", "Lower abdomen", "Right lower abdomen", "Left lower abdomen",
          "Stomach", "Liver", "Spleen", "Gallbladder", "Pancreas", "Upper back", "Mid back",
          "Lower back", "Spine", "Pelvis", "Groin", "Pubic area", "Genitals", "Perineum",
          "Shoulders", "Upper arms (front)", "Upper arms (back)", "Elbows", "Forearms", "Wrists",
          "Hands", "Palms", "Fingers", "Hips", "Buttocks", "Thighs (front)", "Thighs (back)",
          "Knees", "Lower legs (front)", "Lower legs (back)", "Ankles", "Feet", "Soles", "Toes",
          "Small intestine", "Large intestine", "Colon", "Rectum", "Anus", "Kidneys", "Bladder",
          "Brain", "Lymph nodes", "Joints", "Muscles", "Bones", "Bloodstream",
          "Nervous system", "Circulatory system", "Immune system", "Respiratory system",
          "Digestive system", "Urinary system", "Reproductive system",
          "Whole body", "Systemic", "Skin"
        ],
      },
    ],

    questions: [questionSchema],
  },
  { _id: false }
);

const chiefComplaintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    body_parts: [bodyPartSchema],
  },
  {
    timestamps: true, // automatically adds createdAt & updatedAt
  }
);

// Indexes for performance
chiefComplaintSchema.index({ name: 1 });
chiefComplaintSchema.index({ "body_parts.name": 1 });
chiefComplaintSchema.index({ "body_parts.sub_regions": 1 });
chiefComplaintSchema.index({ "body_parts.questions.id": 1 });

export default mongoose.model("ChiefComplaint", chiefComplaintSchema);