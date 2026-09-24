import OpenAI from "openai";
import User from "../models/User.js";
import DoctorProfile from "../models/DoctorProfile.js";
import PatientProfile from "../models/PatientProfile.js";
import Appointment from "../models/Appointment.js";
import { LIVE_PROMPT, BACKEND_PROMPT, TOOLS, APP_NAME, CITY, DIRECTORY } from "../prompts/myDoctorPrompts.js";

const LIVE_MODEL = process.env.LIVE_MODEL || "gpt-live-1";
const BACKEND_MODEL = process.env.BACKEND_MODEL || "gpt-5.6-terra";
const VOICE = process.env.VOICE || "marin";

let client = null;
const getOpenAIClient = () => {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 0,
    });
  }
  return client;
};

// ---------------------------------------------------------------------------
// Call State Management & Server-Sent Events (SSE)
// ---------------------------------------------------------------------------
let call = null;
const subscribers = new Set();

function broadcast(type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data ?? null)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(msg);
    } catch (err) {
      console.error("SSE write error:", err?.message);
    }
  }
}

export const handleSSE = (req, res) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(`event: snapshot\ndata: ${JSON.stringify(call)}\n\n`);
  subscribers.add(res);

  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_) {}
  }, 20000);

  req.on("close", () => {
    clearInterval(ping);
    subscribers.delete(res);
  });
};

export const getConfig = (_req, res) => {
  res.json({
    appName: APP_NAME,
    city: CITY,
    activeCall: !!call,
  });
};

// ---------------------------------------------------------------------------
// Doctor Search Algorithm with Progressive Fallback Relaxation
// ---------------------------------------------------------------------------
function km(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function findLocality(text = "") {
  const q = text.toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (!q) return null;
  const names = Object.keys(DIRECTORY.localities);
  return (
    names.find((n) => n.toLowerCase() === q) ||
    names.find((n) => q.includes(n.toLowerCase()) || n.toLowerCase().includes(q)) ||
    null
  );
}

function searchDoctors(prefs) {
  const localityName = findLocality(prefs.locality);
  if (!localityName) {
    return {
      status: "unknown_locality",
      note: `Couldn't locate "${prefs.locality}". Choose a nearby Kochi area from: ${Object.keys(DIRECTORY.localities).join(", ")}.`,
    };
  }

  const origin = DIRECTORY.localities[localityName];
  const insurer = prefs.insurance && !["self_pay", "other"].includes(prefs.insurance) ? prefs.insurance : null;

  let maxKm = Number(prefs.max_distance_km) > 0 ? Number(prefs.max_distance_km) : 10;
  let minYears = Number(prefs.min_years_experience) > 0 ? Number(prefs.min_years_experience) : 0;
  let gender = ["female", "male"].includes(prefs.gender) ? prefs.gender : "any";
  let needInsurer = insurer;
  const relaxed = [];

  const pool = DIRECTORY.doctors
    .filter((d) => d.specialty === prefs.specialty)
    .map((d) => ({ ...d, distance_km: Math.round(km(origin, d) * 10) / 10 }));

  const run = () =>
    pool
      .filter((d) => d.distance_km <= maxKm)
      .filter((d) => d.years_experience >= minYears)
      .filter((d) => gender === "any" || d.gender === gender)
      .filter((d) => !needInsurer || d.insurance.includes(needInsurer))
      .sort((a, b) => a.distance_km - b.distance_km || b.years_experience - a.years_experience);

  let matches = run();
  const steps = [
    () => {
      if (maxKm < 25) {
        relaxed.push(`widened search radius from ${maxKm} km to 25 km`);
        maxKm = 25;
        return true;
      }
    },
    () => {
      if (minYears > 0) {
        relaxed.push(`dropped the minimum experience requirement of ${minYears} yrs`);
        minYears = 0;
        return true;
      }
    },
    () => {
      if (gender !== "any") {
        relaxed.push(`included doctors of any gender`);
        gender = "any";
        return true;
      }
    },
    () => {
      if (needInsurer) {
        relaxed.push(`none accept ${needInsurer}, showing self-pay options`);
        needInsurer = null;
        return true;
      }
    },
  ];

  for (const step of steps) {
    if (matches.length) break;
    if (step()) matches = run();
  }

  return {
    status: matches.length ? "ok" : "no_matches",
    specialty: prefs.specialty,
    from_locality: localityName,
    preferences: {
      locality: localityName,
      max_distance_km: Number(prefs.max_distance_km) > 0 ? Number(prefs.max_distance_km) : 10,
      gender: ["female", "male"].includes(prefs.gender) ? prefs.gender : "any",
      min_years_experience: Number(prefs.min_years_experience) > 0 ? Number(prefs.min_years_experience) : 0,
      insurance: prefs.insurance || "not stated",
    },
    relaxed,
    matches: matches.slice(0, 3).map((d) => ({
      id: d.id,
      name: d.name,
      gender: d.gender,
      specialty: d.specialty,
      qualifications: d.qualifications,
      years_experience: d.years_experience,
      clinic: d.clinic,
      locality: d.locality,
      distance_km: d.distance_km,
      insurance_covered: insurer ? d.insurance.includes(insurer) : null,
      accepts_insurance: d.insurance,
      fee_inr: d.fee_inr,
      next_available: d.next_available,
      languages: d.languages,
    })),
  };
}

// ---------------------------------------------------------------------------
// Live Session Negotiation (WebRTC with OpenAI)
// ---------------------------------------------------------------------------
export const createLiveSession = async (req, res) => {
  const sdp = req.body?.sdp;
  if (typeof sdp !== "string" || !sdp.trim()) {
    return res.status(400).json({ error: "An SDP offer is required" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "OPENAI_API_KEY is not configured in backend/.env" });
  }

  try {
    const openai = getOpenAIClient();

    const result = await openai.live.create({
      session: {
        model: LIVE_MODEL,
        instructions: LIVE_PROMPT,
        audio: { output: { voice: VOICE } },
        delegation: {
          type: "responses",
          responses: {
            model: BACKEND_MODEL,
            instructions: BACKEND_PROMPT,
            tools: TOOLS,
            tool_choice: "auto",
            parallel_tool_calls: false,
          },
        },
      },
      transport: { type: "webrtc", sdp },
    });

    call = {
      id: result?.session?.id || `call_${Date.now()}`,
      startedAt: Date.now(),
      status: "active",
      transcript: [],
      assessment: null,
      search: null,
      selected: null,
      booking: null,
      emergency: null,
    };

    broadcast("call_started", call);
    return res.status(201).json(result);
  } catch (error) {
    console.error("Live voice session creation failed:", error?.message || error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Live session negotiation failed",
    });
  }
};

// ---------------------------------------------------------------------------
// Tool Execution Endpoints
// ---------------------------------------------------------------------------
export const handleTranscript = (req, res) => {
  const { role, text } = req.body || {};
  if (!call || !["patient", "assistant"].includes(role) || typeof text !== "string") {
    return res.status(204).end();
  }

  const last = call.transcript.at(-1);
  if (last && last.role === role) {
    last.text += text;
  } else {
    call.transcript.push({ role, text });
  }

  broadcast("transcript", { role, text });
  res.status(204).end();
};

export const handleEmergency = (req, res) => {
  if (!call) return res.status(409).json({ error: "No active call" });
  call.emergency = { ...req.body, at: Date.now() };
  broadcast("emergency", call.emergency);
  res.json({ ok: true });
};

export const handleAssessment = (req, res) => {
  if (!call) return res.status(409).json({ error: "No active call" });
  call.assessment = { ...req.body, at: Date.now() };
  broadcast("assessment", call.assessment);
  res.json({ ok: true });
};

export const findSpecialists = (req, res) => {
  if (!call) return res.status(409).json({ error: "No active call" });
  if (!req.body?.specialty) return res.status(400).json({ error: "specialty is required" });

  const result = searchDoctors(req.body);
  if (result.status !== "unknown_locality") {
    call.search = result;
    call.selected = null;
    broadcast("search", result);
  }
  res.json(result);
};

export const selectDoctor = (req, res) => {
  if (!call) return res.status(409).json({ error: "No active call" });
  const doc = call.search?.matches.find((m) => m.id === req.body?.doctor_id);
  if (!doc) {
    return res.json({
      status: "not_found",
      note: "Doctor not found in current options. Please ask which option was chosen.",
    });
  }
  call.selected = doc;
  broadcast("selected", doc);
  res.json({ status: "ok", doctor: doc });
};

// ---------------------------------------------------------------------------
// 🌟 AUTOMATED USER CREATION & APPOINTMENT BOOKING
// ---------------------------------------------------------------------------
export const bookVoiceAppointment = async (req, res) => {
  try {
    const {
      doctor_id,
      doctorId,
      caller_phone,
      phone,
      patient_name,
      name,
      age,
      gender,
      preferred_slot,
      date,
      timeSlot,
    } = req.body || {};

    const rawPhone = caller_phone || phone;
    const resolvedDocId = doctor_id || doctorId;
    const resolvedName = patient_name || name || "Voice Patient";

    if (!rawPhone) {
      return res.status(400).json({ error: "Caller phone number is required for booking" });
    }
    if (!resolvedDocId) {
      return res.status(400).json({ error: "Doctor ID is required for booking" });
    }

    // Clean phone number
    const cleanPhone = String(rawPhone).replace(/[^\d+]/g, "").trim();

    // 1. Check or Create Patient User
    let patientUser = await User.findOne({ phone: cleanPhone });
    if (!patientUser) {
      patientUser = await User.create({
        name: resolvedName,
        phone: cleanPhone,
        gender: gender || "Not Specified",
        role: "PATIENT",
      });
      console.log(`👤 Created new Talk2Doc patient user for phone: ${cleanPhone}`);
    } else {
      // Update name/gender if newly provided
      if (resolvedName && resolvedName !== "Voice Patient") patientUser.name = resolvedName;
      if (gender) patientUser.gender = gender;
      await patientUser.save();
    }

    // 2. Ensure Patient Profile
    let patientProfile = await PatientProfile.findOne({ user: patientUser._id });
    if (!patientProfile) {
      patientProfile = await PatientProfile.create({
        user: patientUser._id,
        fullName: resolvedName,
        age: Number(age) || undefined,
        gender: gender || patientUser.gender || "Not Specified",
      });
    }

    // 3. Resolve Doctor Profile in MongoDB
    // Try by licenseNumber e.g. MYDOC-D001 or MongoDB _id
    const licenseNumber = `MYDOC-${String(resolvedDocId).toUpperCase()}`;
    let doctor = await DoctorProfile.findOne({
      $or: [{ licenseNumber }, { _id: resolvedDocId.length === 24 ? resolvedDocId : null }],
    }).populate("hospitalId", "name");

    if (!doctor) {
      // Fallback search by doctor name if from memory
      doctor = await DoctorProfile.findOne({
        fullName: new RegExp(call?.selected?.name || "", "i"),
      });
    }

    if (!doctor) {
      return res.status(404).json({ error: `Doctor ${resolvedDocId} not found in database` });
    }

    // 4. Calculate Date & TimeSlot
    let targetDateStr = date;
    if (!targetDateStr) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      targetDateStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD
    }

    let targetSlot = timeSlot || preferred_slot || "11:00-11:30";
    if (targetSlot.includes("AM") || targetSlot.includes("PM")) {
      targetSlot = "11:00-11:30"; // Normalize
    }

    // 5. Create Appointment in Talk2Doc DB
    let appointment;
    try {
      appointment = await Appointment.create({
        patientId: patientUser._id,
        doctorId: doctor._id,
        hospitalId: doctor.hospitalId,
        date: targetDateStr,
        timeSlot: targetSlot,
        paymentMode: "Offline",
        paymentStatus: "Pending",
        status: "Confirmed",
      });
    } catch (apptErr) {
      if (apptErr.code === 11000) {
        // If slot already booked, shift by 30 mins
        targetSlot = "11:30-12:00";
        appointment = await Appointment.create({
          patientId: patientUser._id,
          doctorId: doctor._id,
          hospitalId: doctor.hospitalId,
          date: targetDateStr,
          timeSlot: targetSlot,
          paymentMode: "Offline",
          paymentStatus: "Pending",
          status: "Confirmed",
        });
      } else {
        throw apptErr;
      }
    }

    const bookingResult = {
      bookingId: appointment._id,
      patient: {
        id: patientUser._id,
        name: patientUser.name,
        phone: patientUser.phone,
      },
      doctor: {
        id: doctor._id,
        name: doctor.fullName,
        specialization: doctor.specialization,
        fee: doctor.consultationFee,
        licenseNumber: doctor.licenseNumber,
      },
      appointment: {
        id: appointment._id,
        date: targetDateStr,
        timeSlot: targetSlot,
        status: "Confirmed",
        paymentMode: "Offline",
      },
    };

    if (call) {
      call.booking = bookingResult;
    }

    // Broadcast booking event to both live operator view & caller screen
    broadcast("booking_confirmed", bookingResult);

    console.log(`✅ Appointment #${appointment._id} booked for ${patientUser.name} with ${doctor.fullName}`);

    return res.status(201).json({
      status: "ok",
      success: true,
      message: `Appointment confirmed with ${doctor.fullName}`,
      booking: bookingResult,
    });
  } catch (err) {
    console.error("Voice appointment booking failed:", err);
    return res.status(500).json({
      error: "Failed to book appointment",
      details: err.message,
    });
  }
};

export const endCall = (_req, res) => {
  if (call) {
    call.status = "ended";
    call.endedAt = Date.now();
    broadcast("ended", { at: call.endedAt });
  }
  res.status(204).end();
};
