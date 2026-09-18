// models/Syndrome.js — CLINICAL DECISION TREE ENGINE v3
import mongoose from "mongoose";
const QuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["yesno", "mcq", "number", "text", "scale"],
      default: "yesno",
    },
    options: [{ value: String, label: String }],
    maps_to: String,
    rank: { type: Number, default: 99 },

    // ✅ BACKWARD COMPATIBLE
    // Supports:
    // 1) { question_id, required_value }
    // 2) [ { question_id, required_value }, ... ]
    depends_on: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false }
);


const RedFlagSchema = new mongoose.Schema(
  {
    question_id: { type: String, required: true },
    text: { type: String, required: true },
    emergency_message: {
      type: String,
      default: "SEEK EMERGENCY CARE IMMEDIATELY",
    },
  },
  { _id: false }
);

const SyndromeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },

    // One syndrome per chief complaint (+ optional body part)
    triggers: {
      entries: [
        {
          chief_complaint: { type: String, required: true, lowercase: true, trim: true },
          body_part: { type: String, lowercase: true, trim: true }, // optional
          priority: { type: Number, default: 100 }, // lower = higher priority
        },
      ],
    },

    // Root question(s) per chief complaint
    root_questions: {
      type: Map,
      of: [QuestionSchema],
      default: () => new Map(),
    },

    // All other questions (core, risk, sub-questions)
    question_tree: [QuestionSchema],

    // Safety first
    red_flags: [RedFlagSchema],

  

    // Deep branching support
    branching_rules: [
      {
        depends_on: {
          question_id: { type: String, required: true },
          required_value: [{ type: String }],
        },
        then_ask: [{ type: String }], // question IDs
      },
    ],

    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
SyndromeSchema.index({ "triggers.entries.chief_complaint": 1 });
SyndromeSchema.index({ "triggers.entries.body_part": 1 });
SyndromeSchema.index({ name: 1 });

export default mongoose.models.Syndrome || mongoose.model("Syndrome", SyndromeSchema);