/**
 * seedMedicalNetwork.js
 * Seeds realistic partner hospitals, doctors for all 13 clinical departments,
 * accepted insurance providers, and Mon-Sun 09:00-17:00 availability.
 *
 * Run: node scripts/seedMedicalNetwork.js
 */

import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../models/User.js";
import HospitalProfile from "../models/HospitalProfile.js";
import DoctorProfile from "../models/DoctorProfile.js";
import InsuranceProvider from "../models/InsuranceProvider.js";

// ─────────────────────────────────────────────
// Data Definitions
// ─────────────────────────────────────────────

const INSURANCE_NAMES = [
  "Star Health Insurance",
  "HDFC ERGO Health Insurance",
  "Care Health Insurance",
  "Niva Bupa (formerly Max Bupa)",
  "ICICI Lombard",
  "Bajaj Allianz",
  "Tata AIG",
  "Acko General Insurance",
  "Aditya Birla Health Insurance",
  "Reliance General Insurance",
  "New India Assurance",
  "United India Insurance",
  "Oriental Insurance",
  "ManipalCigna Health Insurance",
  "Royal Sundaram General Insurance",
  "Future Generali India Insurance",
  "SBI General Insurance",
  "IFFCO Tokio General Insurance",
  "Cholamandalam MS General Insurance",
  "Digit Insurance",
];

// 5 Hospitals in Kochi/Ernakulam region
const HOSPITAL_DATA = [
  {
    name: "Aster Medcity",
    licenseNumber: "KL-HOSP-0001",
    gstin: "32AABCA1234A1Z5",
    address: "Kuttisahib Road, South Chittoor, Cheranalloor, Kochi, Kerala 682027",
    coordinates: [76.2766, 10.028], // [lng, lat]
    contactPhone: "+91-484-666-8000",
    email: "contact@astermedcity.com",
    website: "https://astermedcity.com",
    insuranceSlice: [0, 8], // indexes from INSURANCE_NAMES
  },
  {
    name: "VPS Lakeshore Hospital",
    licenseNumber: "KL-HOSP-0002",
    gstin: "32AABCB2345B2Z6",
    address: "NH 66, Nettoor, Maradu, Kochi, Kerala 682040",
    coordinates: [76.2999, 9.9399],
    contactPhone: "+91-484-270-1032",
    email: "info@vpslakeshore.com",
    website: "https://vpslakeshore.com",
    insuranceSlice: [2, 12],
  },
  {
    name: "Futurace Hospital",
    licenseNumber: "KL-HOSP-0003",
    gstin: "32AABCC3456C3Z7",
    address: "Ernakulam North, Kochi, Kerala 682018",
    coordinates: [76.341, 10.0159],
    contactPhone: "+91-484-123-4567",
    email: "care@futurace.in",
    website: "https://futurace.in",
    insuranceSlice: [4, 14],
  },
  {
    name: "Amrita Institute of Medical Sciences",
    licenseNumber: "KL-HOSP-0004",
    gstin: "32AABCD4567D4Z8",
    address: "AIMS Ponekkara, Edapally, Kochi, Kerala 682041",
    coordinates: [76.2917, 10.0326],
    contactPhone: "+91-484-285-8136",
    email: "info@amritahospital.org",
    website: "https://amritahospital.org",
    insuranceSlice: [6, 16],
  },
  {
    name: "Rajagiri Hospital",
    licenseNumber: "KL-HOSP-0005",
    gstin: "32AABCE5678E5Z9",
    address: "Chunangamvely, Aluva, Ernakulam, Kerala 683112",
    coordinates: [76.3533, 10.1065],
    contactPhone: "+91-484-295-2400",
    email: "care@rajagirihospital.com",
    website: "https://rajagirihospital.com",
    insuranceSlice: [8, 18],
  },
];

// Doctors per department — 2-3 per hospital, covers all 13 departments
const DEPARTMENT_DOCTORS = [
  // ─── Aster Medcity ───
  {
    fullName: "Dr. Priya Menon",
    specialization: "Cardiology",
    yearsOfExperience: 14,
    consultationFee: 800,
    licenseNumber: "KMC-DOC-0001",
    qualifications: ["MBBS", "MD (Cardiology)", "DM"],
    bio: "Senior interventional cardiologist with expertise in heart failure and coronary artery disease.",
    languages: ["English", "Malayalam", "Hindi"],
    phone: "+91-98460-00001",
    hospitalIndex: 0, // Aster Medcity
  },
  {
    fullName: "Dr. Rajan Nair",
    specialization: "Neurology",
    yearsOfExperience: 11,
    consultationFee: 750,
    licenseNumber: "KMC-DOC-0002",
    qualifications: ["MBBS", "MD (Neurology)", "DM"],
    bio: "Specialist in stroke management, epilepsy, and neurodegenerative disorders.",
    languages: ["English", "Malayalam"],
    phone: "+91-98460-00002",
    hospitalIndex: 0,
  },
  {
    fullName: "Dr. Anita Varghese",
    specialization: "Gynecology",
    yearsOfExperience: 16,
    consultationFee: 700,
    licenseNumber: "KMC-DOC-0003",
    qualifications: ["MBBS", "MS (OBG)", "FMAS"],
    bio: "Expert in high-risk obstetrics, laparoscopic gynecology, and reproductive medicine.",
    languages: ["English", "Malayalam", "Tamil"],
    phone: "+91-98460-00003",
    hospitalIndex: 0,
  },

  // ─── VPS Lakeshore Hospital ───
  {
    fullName: "Dr. Suresh Rao",
    specialization: "Orthopedics",
    yearsOfExperience: 18,
    consultationFee: 850,
    licenseNumber: "KMC-DOC-0004",
    qualifications: ["MBBS", "MS (Ortho)", "DNB", "FRCS"],
    bio: "Joint replacement and sports injury specialist with international fellowship training.",
    languages: ["English", "Malayalam", "Kannada"],
    phone: "+91-98460-00004",
    hospitalIndex: 1, // Lakeshore
  },
  {
    fullName: "Dr. Deepa Krishnan",
    specialization: "Dermatology",
    yearsOfExperience: 9,
    consultationFee: 600,
    licenseNumber: "KMC-DOC-0005",
    qualifications: ["MBBS", "MD (Dermatology)", "DVL"],
    bio: "Clinical dermatologist specializing in eczema, psoriasis, acne, and aesthetic procedures.",
    languages: ["English", "Malayalam"],
    phone: "+91-98460-00005",
    hospitalIndex: 1,
  },
  {
    fullName: "Dr. Thomas Mathew",
    specialization: "Gastroenterology",
    yearsOfExperience: 13,
    consultationFee: 780,
    licenseNumber: "KMC-DOC-0006",
    qualifications: ["MBBS", "MD (Medicine)", "DM (Gastro)"],
    bio: "Expert in endoscopy, liver disorders, IBD, and GI oncology screening.",
    languages: ["English", "Malayalam", "Hindi"],
    phone: "+91-98460-00006",
    hospitalIndex: 1,
  },

  // ─── Futurace Hospital ───
  {
    fullName: "Dr. Ajai Kumar",
    specialization: "General Medicine",
    yearsOfExperience: 8,
    consultationFee: 500,
    licenseNumber: "KMC-DOC-0007",
    qualifications: ["MBBS", "MD (General Medicine)"],
    bio: "Primary care physician specializing in internal medicine, preventive health, and chronic disease management.",
    languages: ["English", "Malayalam", "Tamil"],
    phone: "+91-98460-00007",
    hospitalIndex: 2, // Futurace
  },
  {
    fullName: "Dr. Sreeja Pillai",
    specialization: "Pulmonology",
    yearsOfExperience: 10,
    consultationFee: 720,
    licenseNumber: "KMC-DOC-0008",
    qualifications: ["MBBS", "MD (Pulmonology)", "DM"],
    bio: "Respiratory specialist managing asthma, COPD, sleep apnea, and interstitial lung diseases.",
    languages: ["English", "Malayalam"],
    phone: "+91-98460-00008",
    hospitalIndex: 2,
  },
  {
    fullName: "Dr. Mohan Das",
    specialization: "ENT (Otolaryngology)",
    yearsOfExperience: 12,
    consultationFee: 650,
    licenseNumber: "KMC-DOC-0009",
    qualifications: ["MBBS", "MS (ENT)", "DNB"],
    bio: "ENT specialist in sinus disorders, hearing loss, thyroid surgery, and head & neck oncology.",
    languages: ["English", "Malayalam", "Hindi"],
    phone: "+91-98460-00009",
    hospitalIndex: 2,
  },

  // ─── Amrita Institute ───
  {
    fullName: "Dr. Latha Iyer",
    specialization: "Ophthalmology",
    yearsOfExperience: 15,
    consultationFee: 700,
    licenseNumber: "KMC-DOC-0010",
    qualifications: ["MBBS", "MS (Ophthalmology)", "FRCS (Ophth)"],
    bio: "Cataract, cornea, and retinal specialist with experience in phacoemulsification and LASIK.",
    languages: ["English", "Malayalam", "Tamil"],
    phone: "+91-98460-00010",
    hospitalIndex: 3, // Amrita
  },
  {
    fullName: "Dr. Sajan George",
    specialization: "Urology",
    yearsOfExperience: 11,
    consultationFee: 780,
    licenseNumber: "KMC-DOC-0011",
    qualifications: ["MBBS", "MS (General Surgery)", "MCh (Urology)"],
    bio: "Urologist specializing in robotic surgery, kidney stones, prostate disease, and urologic oncology.",
    languages: ["English", "Malayalam"],
    phone: "+91-98460-00011",
    hospitalIndex: 3,
  },
  {
    fullName: "Dr. Meera Chandran",
    specialization: "Pediatrics",
    yearsOfExperience: 13,
    consultationFee: 600,
    licenseNumber: "KMC-DOC-0012",
    qualifications: ["MBBS", "MD (Pediatrics)", "DCH"],
    bio: "General pediatrician and neonatologist specializing in childhood infectious diseases and development.",
    languages: ["English", "Malayalam", "Hindi"],
    phone: "+91-98460-00012",
    hospitalIndex: 3,
  },

  // ─── Rajagiri Hospital ───
  {
    fullName: "Dr. Vinod Kaimal",
    specialization: "Psychiatry",
    yearsOfExperience: 9,
    consultationFee: 700,
    licenseNumber: "KMC-DOC-0013",
    qualifications: ["MBBS", "MD (Psychiatry)", "MRCPsych"],
    bio: "Clinical psychiatrist specializing in anxiety, depression, bipolar disorder, and substance dependence.",
    languages: ["English", "Malayalam"],
    phone: "+91-98460-00013",
    hospitalIndex: 4, // Rajagiri
  },
  {
    fullName: "Dr. Neha Menon",
    specialization: "General Medicine",
    yearsOfExperience: 7,
    consultationFee: 450,
    licenseNumber: "KMC-DOC-0014",
    qualifications: ["MBBS", "MD (Internal Medicine)"],
    bio: "Internal medicine physician with focus on diabetes management, hypertension, and lifestyle disorders.",
    languages: ["English", "Malayalam"],
    phone: "+91-98460-00014",
    hospitalIndex: 4,
  },
  {
    fullName: "Dr. Asha Devadas",
    specialization: "Cardiology",
    yearsOfExperience: 20,
    consultationFee: 900,
    licenseNumber: "KMC-DOC-0015",
    qualifications: ["MBBS", "MD", "DM (Cardiology)", "FACC"],
    bio: "Senior cardiologist specializing in electrophysiology, echocardiography, and preventive cardiology.",
    languages: ["English", "Malayalam", "Tamil"],
    phone: "+91-98460-00015",
    hospitalIndex: 4,
  },
];

const ALL_WEEK_WORKING_HOURS = {
  start: "09:00",
  end: "17:00",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

// ─────────────────────────────────────────────
// Main Seeding Logic
// ─────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // ── 1. Ensure insurance providers exist ──────────────────────────
    console.log("\n📋 Seeding insurance providers...");
    const insuranceMap = {};
    for (const name of INSURANCE_NAMES) {
      let ins = await InsuranceProvider.findOne({ name });
      if (!ins) {
        ins = await InsuranceProvider.create({ name, active: true });
        console.log(`  + Created insurance: ${name}`);
      } else {
        console.log(`  ~ Exists: ${name}`);
      }
      insuranceMap[name] = ins._id;
    }
    const insuranceIds = Object.values(insuranceMap);

    // ── 2. Upsert hospital users + profiles ─────────────────────────
    console.log("\n🏥 Seeding hospitals...");
    const hospitalProfileIds = []; // HospitalProfile._id (NOT user ID)
    const hospitalUserIds = [];    // User._id for the hospital user

    for (let i = 0; i < HOSPITAL_DATA.length; i++) {
      const h = HOSPITAL_DATA[i];

      // Upsert User for hospital
      let user = await User.findOne({ email: `admin@${h.licenseNumber.toLowerCase()}.hospital.in` });
      if (!user) {
        user = await User.create({
          name: h.name,
          email: `admin@${h.licenseNumber.toLowerCase()}.hospital.in`,
          phone: h.contactPhone,
          role: "HOSPITAL",
        });
      }

      // Build accepted insurances for this hospital
      const slice = INSURANCE_NAMES.slice(h.insuranceSlice[0], h.insuranceSlice[1]).map(
        (n) => insuranceMap[n]
      );

      // Upsert HospitalProfile
      let profile = await HospitalProfile.findOne({ licenseNumber: h.licenseNumber });
      if (!profile) {
        profile = await HospitalProfile.create({
          user: user._id,
          name: h.name,
          licenseNumber: h.licenseNumber,
          gstin: h.gstin,
          address: h.address,
          location: { type: "Point", coordinates: h.coordinates },
          contactPhone: h.contactPhone,
          email: h.email,
          website: h.website,
          acceptedInsurances: slice,
          isVerified: true,
        });
        console.log(`  + Created hospital: ${h.name}`);
      } else {
        // Update geo and insurances even if already exists
        profile.location = { type: "Point", coordinates: h.coordinates };
        profile.acceptedInsurances = slice;
        profile.isVerified = true;
        await profile.save();
        console.log(`  ~ Updated hospital: ${h.name} (coordinates + insurances)`);
      }

      hospitalProfileIds[i] = profile._id;
      hospitalUserIds[i] = user._id;
    }

    // ── 3. Upsert 2d-sphere index on HospitalProfile ────────────────
    console.log("\n🗺  Ensuring geo index on HospitalProfile.location...");
    try {
      await HospitalProfile.collection.createIndex({ location: "2dsphere" });
      console.log("  ✅ 2dsphere index ready");
    } catch (idxErr) {
      console.warn("  ⚠️  Index creation:", idxErr.message);
    }

    // ── 4. Upsert doctors ────────────────────────────────────────────
    console.log("\n👨‍⚕️ Seeding doctors...");
    for (const d of DEPARTMENT_DOCTORS) {
      const hospitalUserId = hospitalUserIds[d.hospitalIndex];
      const hospitalName = HOSPITAL_DATA[d.hospitalIndex].name;

      // Check if doctor profile already exists (by license)
      let existing = await DoctorProfile.findOne({ licenseNumber: d.licenseNumber });

      if (existing) {
        // Update availability + working hours
        existing.availability = "Mon-Sun 09:00 - 17:00";
        existing.workingHours = ALL_WEEK_WORKING_HOURS;
        existing.slotDuration = 30;
        existing.hospitalId = hospitalUserId;
        await existing.save();
        console.log(`  ~ Updated: ${d.fullName} [${d.specialization}] @ ${hospitalName}`);
        continue;
      }

      // Create doctor user account
      const email = `${d.licenseNumber.toLowerCase().replace(/-/g, ".")}@futuremedics.in`;
      let docUser = await User.findOne({ email });
      if (!docUser) {
        docUser = await User.create({
          name: d.fullName,
          email,
          phone: d.phone,
          role: "DOCTOR",
        });
      }

      await DoctorProfile.create({
        user: docUser._id,
        fullName: d.fullName,
        specialization: d.specialization,
        yearsOfExperience: d.yearsOfExperience,
        consultationFee: d.consultationFee,
        licenseNumber: d.licenseNumber,
        qualifications: d.qualifications,
        bio: d.bio,
        languages: d.languages,
        phone: d.phone,
        hospitalId: hospitalUserId,
        availability: "Mon-Sun 09:00 - 17:00",
        workingHours: ALL_WEEK_WORKING_HOURS,
        slotDuration: 30,
      });

      console.log(`  + Created: ${d.fullName} [${d.specialization}] @ ${hospitalName}`);
    }

    // ── 5. Summary ───────────────────────────────────────────────────
    const totalDoctors = await DoctorProfile.countDocuments();
    const totalHospitals = await HospitalProfile.countDocuments();
    const totalInsurance = await InsuranceProvider.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log("\n───────────────────────────────────────────");
    console.log("✅ Seeding complete!");
    console.log(`   Hospitals:   ${totalHospitals}`);
    console.log(`   Doctors:     ${totalDoctors}`);
    console.log(`   Insurances:  ${totalInsurance}`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log("───────────────────────────────────────────\n");

  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
