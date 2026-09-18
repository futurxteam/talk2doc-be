#!/usr/bin/env node
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import Disease from "../models/Disease.js";

// Handle __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.resolve(__dirname, "../.env") });

(async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("MONGO_URI not found in ../.env");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000,
    });
    console.log("Connected to MongoDB");

    // Load diseases
    const diseases = await Disease.find({}).lean();
    console.log(`Loaded ${diseases.length} diseases`);

    if (diseases.length === 0) {
      console.warn("No diseases found. Import data first!");
      return;
    }

    // ────── 1. Build Vocabulary (with normalization) ──────
    const symptomSet = new Set();
    const symptomMap = new Map(); // norm → original
    let sid = 0;

    for (const d of diseases) {
      if (!d.symptoms || !Array.isArray(d.symptoms)) continue;
      for (let s of d.symptoms) {
        const original = s;
        s = s.toLowerCase().trim();
        if (!symptomSet.has(s)) {
          symptomSet.add(s);
          symptomMap.set(s, original); // preserve original for reverse lookup
          sid++;
        }
      }
    }

    const vocab = {};
    const reverseVocab = Array(sid);
    symptomSet.forEach((norm) => {
      const id = vocab[norm] = symptomSet.size - [...symptomSet].indexOf(norm) - 1;
      reverseVocab[id] = symptomMap.get(norm);
    });

    // ────── DEBUG: Check critical symptoms ──────
    const checkSymptoms = ["watery diarrhea", "vomiting", "leg cramps", "severe dehydration"];
    console.log("\n[VOCAB CHECK]");
    checkSymptoms.forEach(s => {
      const norm = s.toLowerCase().trim();
      const id = vocab[norm];
      console.log(`  "${s}" → ${id !== undefined ? `ID: ${id}` : "MISSING"}`);
    });

    // ────── 2. Inverted Index ──────
    const invertedIndex = Array.from({ length: sid }, () => []);
    diseases.forEach((d, idx) => {
      if (!d.symptoms) return;
      d.symptoms.forEach((s) => {
        const norm = s.toLowerCase().trim();
        const sId = vocab[norm];
        if (sId !== undefined) {
          invertedIndex[sId].push(idx);
        }
      });
    });

    // ────── 3. Bitsets ──────
    const BITS_PER_D = Math.ceil(sid / 8);
    const bitsets = Buffer.alloc(diseases.length * BITS_PER_D, 0);

    diseases.forEach((d, dIdx) => {
      if (!d.symptoms) return;
      d.symptoms.forEach((s) => {
        const norm = s.toLowerCase().trim();
        const sId = vocab[norm];
        if (sId === undefined) return;
        const byteOffset = dIdx * BITS_PER_D + Math.floor(sId / 8);
        const bitOffset = sId % 8;
        bitsets[byteOffset] |= 1 << bitOffset;
      });
    });

    // ────── 4. Save Outputs ──────
    const dataDir = path.resolve(__dirname, "../data");
    fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(
      path.join(dataDir, "vocab.json"),
      JSON.stringify({ vocab, reverseVocab }, null, 2)
    );
    fs.writeFileSync(
      path.join(dataDir, "symptom_index.json"),
      JSON.stringify(invertedIndex)
    );
    fs.writeFileSync(path.join(dataDir, "bitsets.bin"), bitsets);

    console.log(`\nPrecomputed ${sid} unique symptoms`);
    console.log(`Bitset size: ${(bitsets.length / 1024).toFixed(2)} KB`);
    console.log(`Files saved to: ${dataDir}`);

  } catch (err) {
    console.error("Precompute failed:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
})();