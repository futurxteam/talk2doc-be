import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    emergency: Boolean,
    emergencyReason: String,
    recommendation: String,

    results: Array,        // diseases + scores
    collected: Object,     // symptoms, answers, risk factors
    activeSyndromes: Array,

  },
  { timestamps: true }
);

export default mongoose.model("Assessment", assessmentSchema);
