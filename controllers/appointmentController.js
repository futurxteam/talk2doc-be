import Appointment from "../models/Appointment.js";
import DoctorProfile from "../models/DoctorProfile.js";
import User from "../models/User.js";

/* ===============================
   UTIL: Time helpers
=============================== */
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/* ===============================
   GET AVAILABLE SLOTS
   GET /api/appointments/slots?doctorId=&date=
=============================== */
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Verify that the doctor has active availability configured
    if (
      !doctor.availability ||
      doctor.availability.trim() === "" ||
      /unavailable|not available|closed|none/i.test(doctor.availability)
    ) {
      return res.json({ slots: [], message: "Doctor has no active availability marked" });
    }

    // Check day of week
    const dayName = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
    }); // "Mon", "Tue"

    if (!doctor.workingHours?.days || !doctor.workingHours.days.includes(dayName)) {
      return res.json({ slots: [] });
    }

    const startMin = timeToMinutes(doctor.workingHours.start);
    const endMin = timeToMinutes(doctor.workingHours.end);
    const duration = doctor.slotDuration || 30;

    // Generate all slots
    const allSlots = [];
    for (let t = startMin; t + duration <= endMin; t += duration) {
      const s = minutesToTime(t);
      const e = minutesToTime(t + duration);
      allSlots.push(`${s}-${e}`);
    }

    // Fetch booked slots
    const booked = await Appointment.find({
      doctorId,
      date,
      status: { $ne: "Cancelled" },
    }).select("timeSlot");

    const bookedSet = new Set(booked.map((b) => b.timeSlot));

    // Subtract
    const available = allSlots.filter((s) => !bookedSet.has(s));

    res.json({ slots: available });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get slots" });
  }
};

/* ===============================
   BOOK APPOINTMENT (GUEST / NO AUTH)
   POST /api/appointments/guest-book
=============================== */
export const guestBookAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      date,
      timeSlot,
      paymentMode = "Offline",
      assessmentId,
      name,
      age,
      gender,
      height,
      weight,
      phone
    } = req.body;

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Create a guest patient record with demographic information
    const guestUser = await User.create({
      name: name || (age ? `Patient (${age}y, ${gender || 'N/A'})` : "Voice Guest Patient"),
      gender: gender || "Not Specified",
      height: Number(height) || undefined,
      weight: Number(weight) || undefined,
      phone: phone || "",
      role: "PATIENT",
    });

    const appointment = await Appointment.create({
      patientId: guestUser._id,
      doctorId,
      hospitalId: doctor.hospitalId,
      date: new Date(date),
      timeSlot,
      paymentMode: paymentMode || "Offline",
      paymentStatus: paymentMode === "Online" ? "Paid" : "Pending",
      status: "Confirmed",
      assessmentId,
    });

    res.json({
      success: true,
      bookingId: appointment._id,
      appointment,
      doctor: {
        fullName: doctor.fullName,
        specialization: doctor.specialization,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Slot already booked" });
    }
    console.error("Guest booking failed:", err);
    res.status(500).json({ message: "Booking failed", error: err.message });
  }
};

/* ===============================
   BOOK APPOINTMENT
   POST /api/appointments/book
=============================== */
export const bookAppointment = async (req, res) => {
  try {
    const userId = req.user.id; // patient
    const { doctorId, date, timeSlot, paymentMode, assessmentId } = req.body;

    const doctor = await DoctorProfile.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const appointment = await Appointment.create({
      patientId: userId,
      doctorId,
      hospitalId: doctor.hospitalId,
date: new Date(date),       timeSlot,
      paymentMode: paymentMode || "Offline",
      paymentStatus: paymentMode === "Online" ? "Paid" : "Pending",
      assessmentId,
    });

    res.json({ success: true, appointment });
  } catch (err) {
    // 🔥 Duplicate slot protection
    if (err.code === 11000) {
      return res.status(400).json({ message: "Slot already booked" });
    }
    console.error(err);
    res.status(500).json({ message: "Booking failed" });
  }
};

/* ===============================
   MY APPOINTMENTS (PATIENT)
=============================== */
export const myAppointments = async (req, res) => {
  const list = await Appointment.find({ patientId: req.user.id })
    .populate("doctorId", "fullName specialization consultationFee experience location hospitalId qualifications")
    .sort({ date: 1 });

  res.json({ appointments: list });
};

/* ===============================
   GET APPOINTMENTS BY PHONE (PUBLIC / NO TOKEN)
   GET /api/appointments/by-phone?phone=
=============================== */
export const getAppointmentsByPhone = async (req, res) => {
  try {
    const rawPhone = (req.query.phone || "").trim();
    if (!rawPhone) {
      return res.status(400).json({ success: false, message: "Please provide a valid phone number" });
    }

    const cleanDigits = rawPhone.replace(/\D/g, "");
    const searchPhone = cleanDigits.length >= 7 ? cleanDigits.slice(-10) : rawPhone;

    // Search users by matching phone
    const users = await User.find({
      phone: { $regex: searchPhone, $options: "i" },
    }).select("_id name phone");

    const userIds = users.map((u) => u._id);

    // Find appointments belonging to these user IDs or phone query
    const appointments = await Appointment.find({
      patientId: { $in: userIds },
    })
      .populate({
        path: "doctorId",
        select: "fullName specialization consultationFee experience location hospitalId qualifications",
        populate: {
          path: "hospitalId",
          select: "name address city phone",
        },
      })
      .populate("patientId", "name phone gender age")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      phone: rawPhone,
      count: appointments.length,
      appointments,
    });
  } catch (err) {
    console.error("getAppointmentsByPhone error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch appointments by phone" });
  }
};


/* ===============================
   DOCTOR / HOSPITAL APPOINTMENTS
=============================== */
// GET /api/doctor/appointments?type=upcoming|past&date=YYYY-MM-DD
export const doctorAppointments = async (req, res) => {
  const doctorProfile = await DoctorProfile.findOne({ user: req.user.id });

  if (!doctorProfile) {
    return res.status(403).json({ message: "Not a doctor" });
  }

  const { type = "upcoming", date } = req.query;

  const filter = {
    doctorId: doctorProfile._id,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0); // midnight today

  if (date) {
    // Exact date filter
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    filter.date = { $gte: d, $lt: next };
  } else {
    if (type === "upcoming") {
      filter.date = { $gte: today };
    }

    if (type === "past") {
      filter.date = { $lt: today };
    }
  }

  const list = await Appointment.find(filter)
    .populate("patientId", "name phone")
    .sort({ date: 1, timeSlot: 1 });

  res.json({ success: true, appointments: list });
};

export const hospitalAppointments = async (req, res) => {
  // req.user is HOSPITAL
  const hospitalId = req.user.id;

  const list = await Appointment.find({ hospitalId })
    .populate("doctorId", "fullName specialization")
    .populate("patientId", "name phone")
    .sort({ date: 1, timeSlot: 1 });

  res.json({ appointments: list });
};

/* ===============================
   UPDATE STATUS
=============================== */
export const updateAppointmentStatus = async (req, res) => {
  const { appointmentId, status, paymentStatus } = req.body;

  const appt = await Appointment.findByIdAndUpdate(
    appointmentId,
    { status, paymentStatus },
    { new: true }
  );

  res.json({ success: true, appointment: appt });
};
