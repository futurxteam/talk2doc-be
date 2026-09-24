/**
 * seedMyDoktorDoctors.js
 * Seeds the 90 doctors and 15 clinics from mydoktor247-demo/doctors.json
 * into Talk2Doc MongoDB (InsuranceProvider, User, HospitalProfile, DoctorProfile).
 *
 * Usage: node scripts/seedMyDoktorDoctors.js
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import User from "../models/User.js";
import HospitalProfile from "../models/HospitalProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import InsuranceProvider from "../models/InsuranceProvider.js";
import Appointment from "../models/Appointment.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to doctors.json in mydoktor247-demo
const doctorsJsonPath = path.resolve(__dirname, "../../mydoktor247-demo/doctors.json");

if (!fs.existsSync(doctorsJsonPath)) {
  console.error("❌ doctors.json not found at:", doctorsJsonPath);
  process.exit(1);
}

const directoryData = JSON.parse(fs.readFileSync(doctorsJsonPath, "utf-8"));
const { city, insurers, localities, doctors } = directoryData;

console.log(`📋 Loaded directory data for ${city}:`);
console.log(`   - Insurers: ${insurers.length}`);
console.log(`   - Localities: ${Object.keys(localities).length}`);
console.log(`   - Doctors: ${doctors.length}`);

function sanitizeSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10);
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ── 0. Wipe Existing Doctors & Hospitals ─────────────────────────
    console.log("\n🗑️  Removing all existing doctors, hospitals, and their user accounts...");
    const deletedDocs = await DoctorProfile.deleteMany({});
    const deletedHosps = await HospitalProfile.deleteMany({});
    const deletedUsers = await User.deleteMany({ role: { $in: ["DOCTOR", "HOSPITAL"] } });
    const deletedAppts = await mongoose.model("Appointment").deleteMany({});
    console.log(`   - Removed Doctor Profiles: ${deletedDocs.deletedCount}`);
    console.log(`   - Removed Hospital Profiles: ${deletedHosps.deletedCount}`);
    console.log(`   - Removed Doctor/Hospital Users: ${deletedUsers.deletedCount}`);
    console.log(`   - Reset Stale Appointments: ${deletedAppts.deletedCount}`);
    console.log("\n🏥 Upserting Insurance Providers...");
    const insuranceMap = {};
    for (const insName of insurers) {
      let ins = await InsuranceProvider.findOne({ name: insName });
      if (!ins) {
        ins = await InsuranceProvider.create({ name: insName, active: true });
        console.log(`   + Created insurer: ${insName}`);
      }
      insuranceMap[insName] = ins._id;
    }

    // ── 2. Seed Clinics as Hospital Profiles ──────────────────────────
    console.log("\n🏥 Upserting Clinics / Hospitals...");
    const clinicMap = {}; // clinicName -> { userId, hospitalProfileId }

    // Group doctors by clinic to aggregate accepted insurances
    const clinicGroups = {};
    for (const doc of doctors) {
      if (!clinicGroups[doc.clinic]) {
        clinicGroups[doc.clinic] = {
          name: doc.clinic,
          locality: doc.locality,
          lat: doc.lat,
          lng: doc.lng,
          insurances: new Set(),
        };
      }
      (doc.insurance || []).forEach((ins) => clinicGroups[doc.clinic].insurances.add(ins));
    }

    let clinicIdx = 0;
    for (const [clinicName, cData] of Object.entries(clinicGroups)) {
      clinicIdx++;
      const idCode = String(clinicIdx).padStart(4, "0");
      const licenseNumber = `KL-CLN-${idCode}`;
      const gstin = `32AAACC${idCode}B1Z5`;
      const email = `clinic.${idCode}@talk2doc.in`;
      const phone = `+91-484-${String(2000000 + clinicIdx)}`;

      // Find or create Hospital User
      let hospUser = await User.findOne({ email });
      if (!hospUser) {
        hospUser = await User.create({
          name: clinicName,
          email,
          phone,
          role: "HOSPITAL",
        });
      }

      const acceptedInsuranceIds = Array.from(cData.insurances)
        .map((name) => insuranceMap[name])
        .filter(Boolean);

      let hospProfile = await HospitalProfile.findOne({ licenseNumber });
      if (!hospProfile) {
        hospProfile = await HospitalProfile.create({
          user: hospUser._id,
          name: clinicName,
          licenseNumber,
          gstin,
          address: `${clinicName}, ${cData.locality}, Kochi, Kerala`,
          location: {
            type: "Point",
            coordinates: [cData.lng, cData.lat], // [longitude, latitude]
          },
          contactPhone: phone,
          email,
          acceptedInsurances: acceptedInsuranceIds,
          isVerified: true,
        });
        console.log(`   + Created clinic profile: ${clinicName} (${cData.locality})`);
      } else {
        hospProfile.location = {
          type: "Point",
          coordinates: [cData.lng, cData.lat],
        };
        hospProfile.acceptedInsurances = acceptedInsuranceIds;
        hospProfile.isVerified = true;
        await hospProfile.save();
      }

      clinicMap[clinicName] = {
        userId: hospUser._id,
        profileId: hospProfile._id,
      };
    }

    // ── 3. Seed Doctors ───────────────────────────────────────────────
    console.log("\n👨‍⚕️ Upserting 90 Doctors...");
    let createdCount = 0;
    let updatedCount = 0;

    for (const doc of doctors) {
      const licenseNumber = `MYDOC-${doc.id.toUpperCase()}`;
      const email = `doctor.${doc.id.toLowerCase()}@talk2doc.in`;
      const numDigits = doc.id.replace(/\D/g, "").padStart(5, "0");
      const phone = `+91-98470-${numDigits}`;

      const clinicInfo = clinicMap[doc.clinic];
      if (!clinicInfo) {
        console.warn(`   ⚠️ Clinic not found for doctor: ${doc.name}`);
        continue;
      }

      // Check if User exists
      let docUser = await User.findOne({ email });
      if (!docUser) {
        docUser = await User.create({
          name: doc.name,
          email,
          phone,
          gender: doc.gender === "female" ? "Female" : "Male",
          role: "DOCTOR",
        });
      }

      let docProfile = await DoctorProfile.findOne({ licenseNumber });
      if (!docProfile) {
        docProfile = await DoctorProfile.create({
          user: docUser._id,
          hospitalId: clinicInfo.userId,
          fullName: doc.name,
          specialization: doc.specialty,
          yearsOfExperience: doc.years_experience || 0,
          licenseNumber,
          qualifications: doc.qualifications ? [doc.qualifications] : ["MBBS"],
          bio: `${doc.name} is a specialist in ${doc.specialty} practicing at ${doc.clinic}, ${doc.locality}, Kochi with ${doc.years_experience} years of clinical experience.`,
          languages: doc.languages || ["Malayalam", "English"],
          consultationFee: doc.fee_inr || 500,
          availability: "Mon-Sun 09:00 - 17:00",
          workingHours: {
            start: "09:00",
            end: "17:00",
            days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          },
          slotDuration: 30,
          phone,
          email,
        });
        createdCount++;
      } else {
        docProfile.fullName = doc.name;
        docProfile.specialization = doc.specialty;
        docProfile.yearsOfExperience = doc.years_experience || 0;
        docProfile.consultationFee = doc.fee_inr || 500;
        docProfile.qualifications = doc.qualifications ? [doc.qualifications] : docProfile.qualifications;
        docProfile.languages = doc.languages || docProfile.languages;
        docProfile.availability = "Mon-Sun 09:00 - 17:00";
        docProfile.hospitalId = clinicInfo.userId;
        await docProfile.save();
        updatedCount++;
      }
    }

    console.log(`\n🎉 Seed Completed Successfully!`);
    console.log(`   - Clinics seeded: ${Object.keys(clinicMap).length}`);
    console.log(`   - Doctors created: ${createdCount}`);
    console.log(`   - Doctors updated: ${updatedCount}`);
    console.log(`   - Total doctors in DB: ${createdCount + updatedCount}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed with error:", err);
    process.exit(1);
  }
}

seed();
