import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import symptomRoutes from "./routes/symptomRoutes.js";
import chiefComplaintRoutes from "./routes/chiefComplaintRoutes.js";
import bodyPartRoutes from "./routes/bodyPartRoutes.js";
import Syndromic from "./routes/syndromic.js";
import handler from "./routes/aiBooster.js";
import profileRoutes from "./routes/profileRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import pluginDepartmentRoutes from "./plugin/routes/departmentRoutes.js";
import triageRoutes from "./routes/triageRoutes.js";
import synonymRoutes from "./routes/synonymRoutes.js";
import voiceRoutes from "./routes/voiceRoutes.js";
import { seedSynonymsIfEmpty } from "./controllers/synonymController.js";
import dns from "dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

import dotenv from "dotenv";
dotenv.config();
const app = express();

/* ================================
   CORS — ALLOW ALL (DEV)
   ================================ */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

/* ================================
   BODY PARSERS
   ================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================================
   ROUTES
   ================================ */
app.post("/api/ai-booster", handler);
app.use("/api/voice", voiceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", pluginDepartmentRoutes); // Handles /api/bodyparts, /api/triage, /api/recommend
app.use("/api/synonyms", synonymRoutes);  // Handles /api/synonyms, /api/synonyms/learn
app.use("/api/triage", triageRoutes);    // Handles /api/triage/doctors
app.use("/api/symptoms", symptomRoutes);
app.use("/api/cc", chiefComplaintRoutes);
app.use("/api/syndromic", Syndromic);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/appointments", appointmentRoutes);
/* ================================
   DB + SERVER
   ================================ */
mongoose
   .connect(process.env.MONGO_URI)
   .then(async () => {
      console.log("✅ MongoDB connected");
      await seedSynonymsIfEmpty();
      const PORT = process.env.PORT || 6000;
      app.listen(PORT, () =>
         console.log(`✅ Server running on http://localhost:${PORT}`)
      );
   })
   .catch(err => console.error("❌ MongoDB error:", err));

