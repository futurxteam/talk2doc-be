import mongoose from 'mongoose';

const symptomSynonymSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['symptom', 'duration', 'severity', 'body_area']
    },
    canonicalId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    canonicalName: {
      type: String,
      required: true,
      trim: true
    },
    bodyArea: {
      type: String,
      trim: true,
      default: null
    },
    keywords: {
      type: [String],
      default: [],
      index: true
    },
    phoneticVariations: {
      type: [String],
      default: []
    },
    source: {
      type: String,
      enum: ['system', 'ai_learned', 'admin'],
      default: 'system'
    },
    hitCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index for type + canonicalId
symptomSynonymSchema.index({ type: 1, canonicalId: 1 }, { unique: true });

const SymptomSynonym = mongoose.model('SymptomSynonym', symptomSynonymSchema);

export default SymptomSynonym;
