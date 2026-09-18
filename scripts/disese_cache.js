// scripts/disese_cache.js   (keep .js extension)

import mongoose from "mongoose";
import BodyPart from "../models/BodyPart.js";
import { createRequire } from "module";

// This line fixes require() inside ESM
const require = createRequire(import.meta.url);

// Correct path: from scripts/ → go up 4 levels → Data/
const data = require("../../../Data/test.bodyparts.json");

async function seed() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/symptomchecker");
    console.log("Connected to MongoDB");

    await BodyPart.deleteMany({});
    const result = await BodyPart.insertMany(data);

    console.log(`Seeded ${result.length} body parts successfully!`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();