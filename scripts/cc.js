// scripts/seed-db-from-diseases.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";

// === ESM Setup ===
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Load .env from project root ===
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env file!");
  console.error("Add this to your .env:");
  console.error("MONGO_URI=mongodb://localhost:27017/symptom_checker");
  process.exit(1);
}

console.log("Using MONGO_URI =", MONGO_URI);

// === Paths ===
const DISEASES_JSON = path.resolve(__dirname, "../test.diseases.json");
const OUTPUT_JSON = path.resolve(__dirname, "../cc.json");

// === Schema ===
const chiefComplaintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    body_parts: [String],
    questions: [mongoose.Schema.Types.Mixed],
  },
  { collection: "chiefcomplaints" }
);

const ChiefComplaint = mongoose.model("ChiefComplaint", chiefComplaintSchema);

// === Helpers ===
const toTitleCase = (str) =>
  str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// === Generate Questions ===
const generateQuestions = (disease) => {
  const questions = [];

  // MODIFIERS → MCQ
  for (const [key, opts] of Object.entries(disease.modifiers || {})) {
    const friendly = toTitleCase(key).toLowerCase();
    questions.push({
      id: key,
      text: `What best describes your ${friendly}?`,
      type: "mcq",
      options: Object.entries(opts).map(([val, weight]) => ({
        value: val,
        weight,
        description: toTitleCase(val),
      })),
    });
  }

  // RISK FACTORS → YES/NO
  for (const [key, weight] of Object.entries(disease.risk_factors || {})) {
    const friendly = toTitleCase(key).toLowerCase();
    questions.push({
      id: key,
      text: `Have you been exposed to ${friendly}?`,
      type: "yesno",
      options: [{ value: true, weight, description: "Yes" }],
    });
  }

  return questions;
};

// === Main ===
(async () => {
  console.log("\nStarting seed script...\n");

  // Connect
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }

  try {
    // Load diseases
    if (!fs.existsSync(DISEASES_JSON)) {
      throw new Error(`File not found: ${DISEASES_JSON}`);
    }
    const diseases = JSON.parse(fs.readFileSync(DISEASES_JSON, "utf8"));
    console.log(`Loaded ${diseases.length} diseases from test.diseases.json`);

    // Build chief complaints
    const ccMap = new Map();

    for (const disease of diseases) {
      const questions = generateQuestions(disease);
      const bodyParts = [...new Set(disease.body_parts || [])];

      for (const name of disease.chief_complaints || []) {
        if (!ccMap.has(name)) {
          ccMap.set(name, { name, body_parts: [], questions: [] });
        }
        const cc = ccMap.get(name);

        // Merge body parts
        cc.body_parts = [...new Set([...cc.body_parts, ...bodyParts])];

        // Merge questions (avoid duplicates)
        const existingIds = new Set(cc.questions.map((q) => q.id));
        const newQs = questions.filter((q) => !existingIds.has(q.id));
        cc.questions.push(...newQs);
      }
    }

    const finalCC = Array.from(ccMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Save to cc.json
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(finalCC, null, 2));
    console.log(`Generated cc.json with ${finalCC.length} chief complaints`);

    // Seed DB
    await ChiefComplaint.deleteMany({});
    await ChiefComplaint.insertMany(finalCC);
    console.log(`Seeded ${finalCC.length} documents into chiefcomplaints collection`);

    // Final success message
    console.log("\nAPI READY! Test this:");
    console.log("GET https://talk2doc-be.onrender.com/api/chief-complaints/bodypart/abdomen/watery%20diarrhea");

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exit(1);
  }
})();