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
// Multi-Session Call State Management & Server-Sent Events (SSE)
// ---------------------------------------------------------------------------
// Map of active calls: sessionId -> call object
const calls = new Map();

// Map of SSE subscribers: sessionId -> Set of express response streams
const sessionSubscribers = new Map();

// Global subscribers (fallback for dashboard/observers not specifying a sessionId)
const globalSubscribers = new Set();

function broadcast(sessionId, type, data) {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data ?? null)}\n\n`;

  // 1. Broadcast to all clients specifically subscribed to this session
  if (sessionId && sessionSubscribers.has(sessionId)) {
    const subs = sessionSubscribers.get(sessionId);
    for (const res of subs) {
      try {
        res.write(msg);
      } catch (err) {
        console.error(`SSE write error for session ${sessionId}:`, err?.message);
      }
    }
  }

  // 2. Also forward to global/observer subscribers
  for (const res of globalSubscribers) {
    try {
      res.write(msg);
    } catch (err) {
      console.error("SSE global write error:", err?.message);
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

  const sessionId = req.query?.sessionId || req.query?.session;

  if (sessionId) {
    if (!sessionSubscribers.has(sessionId)) {
      sessionSubscribers.set(sessionId, new Set());
    }
    sessionSubscribers.get(sessionId).add(res);

    // Send snapshot of this specific session
    const currentCall = calls.get(sessionId) || null;
    res.write(`event: snapshot\ndata: ${JSON.stringify(currentCall)}\n\n`);
  } else {
    globalSubscribers.add(res);
    // Fallback: send the most recently updated call
    const allCalls = Array.from(calls.values());
    const latestCall = allCalls.length > 0 ? allCalls[allCalls.length - 1] : null;
    res.write(`event: snapshot\ndata: ${JSON.stringify(latestCall)}\n\n`);
  }

  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_) {}
  }, 20000);

  req.on("close", () => {
    clearInterval(ping);
    if (sessionId && sessionSubscribers.has(sessionId)) {
      const subs = sessionSubscribers.get(sessionId);
      subs.delete(res);
      if (subs.size === 0) {
        sessionSubscribers.delete(sessionId);
      }
    } else {
      globalSubscribers.delete(res);
    }
  });
};

export const getConfig = (req, res) => {
  const sessionId = req.query?.sessionId || req.query?.session;
  const activeCall = sessionId
    ? calls.has(sessionId) && calls.get(sessionId).status === "active"
    : Array.from(calls.values()).some((c) => c.status === "active");

  res.json({
    appName: APP_NAME,
    city: CITY,
    activeCall,
    totalActiveCalls: Array.from(calls.values()).filter((c) => c.status === "active").length,
  });
};

// Periodic cleanup of ended calls older than 1 hour
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, c] of calls.entries()) {
    if (c.status === "ended" && c.endedAt && c.endedAt < oneHourAgo) {
      calls.delete(id);
      sessionSubscribers.delete(id);
    }
  }
}, 10 * 60 * 1000);

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
// Helper to resolve call by sessionId with graceful fallback
function getCall(sessionId) {
  if (sessionId && calls.has(sessionId)) {
    return calls.get(sessionId);
  }
  const allCalls = Array.from(calls.values());
  for (let i = allCalls.length - 1; i >= 0; i--) {
    if (allCalls[i].status === "active") return allCalls[i];
  }
  return allCalls.length > 0 ? allCalls[allCalls.length - 1] : null;
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

  // Resolve or generate a unique sessionId for this call
  const sessionId =
    req.body?.sessionId ||
    `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

    const callObj = {
      id: result?.session?.id || sessionId,
      sessionId,
      startedAt: Date.now(),
      status: "active",
      transcript: [],
      assessment: null,
      search: null,
      selected: null,
      booking: null,
      emergency: null,
    };

    calls.set(sessionId, callObj);

    // Broadcast only to subscribers of this session
    broadcast(sessionId, "call_started", callObj);

    console.log(`🎙️ Started live voice session: ${sessionId}`);

    return res.status(201).json({
      ...result,
      sessionId,
      callId: callObj.id,
    });
  } catch (error) {
    console.error(`Live voice session creation failed for ${sessionId}:`, error?.message || error);
    return res.status(error?.status || 500).json({
      error: error?.message || "Live session negotiation failed",
    });
  }
};

// ---------------------------------------------------------------------------
// Tool Execution Endpoints
// ---------------------------------------------------------------------------
export const handleTranscript = (req, res) => {
  const { role, text, sessionId } = req.body || {};
  if (!["patient", "assistant"].includes(role) || typeof text !== "string") {
    return res.status(204).end();
  }

  const callObj = getCall(sessionId);
  if (!callObj) {
    return res.status(204).end();
  }

  const last = callObj.transcript.at(-1);
  if (last && last.role === role) {
    last.text += text;
  } else {
    callObj.transcript.push({ role, text });
  }

  broadcast(callObj.sessionId, "transcript", { role, text, sessionId: callObj.sessionId });
  res.status(204).end();
};

export const handleEmergency = (req, res) => {
  const { sessionId } = req.body || {};
  const callObj = getCall(sessionId);
  if (!callObj) return res.status(409).json({ error: "No active call" });

  callObj.emergency = { ...req.body, at: Date.now() };
  broadcast(callObj.sessionId, "emergency", callObj.emergency);
  res.json({ ok: true });
};

export const handleAssessment = (req, res) => {
  const { sessionId } = req.body || {};
  const callObj = getCall(sessionId);
  if (!callObj) return res.status(409).json({ error: "No active call" });

  callObj.assessment = { ...req.body, at: Date.now() };
  broadcast(callObj.sessionId, "assessment", callObj.assessment);
  res.json({ ok: true });
};

export const findSpecialists = (req, res) => {
  const { sessionId, specialty } = req.body || {};
  const callObj = getCall(sessionId);
  if (!callObj) return res.status(409).json({ error: "No active call" });
  if (!specialty) return res.status(400).json({ error: "specialty is required" });

  const result = searchDoctors(req.body);
  if (result.status !== "unknown_locality") {
    callObj.search = result;
    callObj.selected = null;
    broadcast(callObj.sessionId, "search", result);
  }
  res.json(result);
};

export const selectDoctor = (req, res) => {
  const { sessionId, doctor_id } = req.body || {};
  const callObj = getCall(sessionId);
  if (!callObj) return res.status(409).json({ error: "No active call" });

  const doc = callObj.search?.matches?.find((m) => m.id === doctor_id);
  if (!doc) {
    return res.json({
      status: "not_found",
      note: "Doctor not found in current options. Please ask which option was chosen.",
    });
  }
  callObj.selected = doc;
  broadcast(callObj.sessionId, "selected", doc);
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
      sessionId,
    } = req.body || {};

    const callObj = getCall(sessionId);

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
    const licenseNumber = `MYDOC-${String(resolvedDocId).toUpperCase()}`;
    let doctor = await DoctorProfile.findOne({
      $or: [{ licenseNumber }, { _id: resolvedDocId.length === 24 ? resolvedDocId : null }],
    }).populate("hospitalId", "name");

    if (!doctor) {
      doctor = await DoctorProfile.findOne({
        fullName: new RegExp(callObj?.selected?.name || "", "i"),
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

    if (callObj) {
      callObj.booking = bookingResult;
      broadcast(callObj.sessionId, "booking_confirmed", bookingResult);
    }

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

export const endCall = (req, res) => {
  const sessionId = req.body?.sessionId || req.query?.sessionId;
  const callObj = getCall(sessionId);
  if (callObj) {
    callObj.status = "ended";
    callObj.endedAt = Date.now();
    broadcast(callObj.sessionId, "ended", { at: callObj.endedAt, sessionId: callObj.sessionId });
    console.log(`📞 Ended live voice session: ${callObj.sessionId}`);
  }
  res.status(204).end();
};
