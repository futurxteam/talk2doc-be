// models/BodyPart.js
import mongoose from "mongoose";

const bodyPartSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  part: {
    type: Map,
    of: String, // key: sub-part name, value: "symptom1, symptom2"
    default: {},
  },
}, {
  collection: "bodyparts",
  timestamps: true,
});

export default mongoose.model("BodyPart", bodyPartSchema);