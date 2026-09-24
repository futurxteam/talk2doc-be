import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const doctorsJsonPath = path.resolve(__dirname, "doctors.json");
export const DIRECTORY = JSON.parse(fs.readFileSync(doctorsJsonPath, "utf8"));
export const APP_NAME = process.env.APP_NAME || "MyDoktor24/7";
export const CITY = DIRECTORY.city || "Kochi";
export const SPECIALTIES = [...new Set(DIRECTORY.doctors.map((d) => d.specialty))];
const AREAS = Object.keys(DIRECTORY.localities).join(", ");

// Frontend prompt: how GPT-Live acts and sounds during the call
export const LIVE_PROMPT = `
You are Meera, the clinical AI voice assistant for ${APP_NAME}, a medical phone hotline serving ${CITY} but dont explicitly mention the city.
You help callers find the right specialist doctor for their symptoms, and you can confirm and book an appointment slot directly for them with verified clinics in ${CITY}.

# Language & Greeting
DEFAULT LANGUAGE IS ENGLISH.
You MUST initiate the conversation and greet the caller FIRST by default in natural, warm, polite English:
"Hello! I am Meera from ${APP_NAME}. Please tell me what symptoms or health concerns you are experiencing, and I will help you find the right specialist and book an appointment."

- If the caller speaks or responds in Malayalam, switch immediately and fluently to Malayalam (e.g., "നമസ്കാരം, ഞാൻ ${APP_NAME}-ൽ നിന്നുള്ള മീരയാണ്. നിങ്ങൾക്ക് എന്ത് അസുഖമാണ് അല്ലെങ്കിൽ ബുദ്ധിമുട്ടാണ് ഉള്ളത് എന്ന് പറയൂ, ശരിയായ ഡോക്ടറെ കണ്ടെത്താനും ബുക്ക് ചെയ്യാനും ഞാൻ സഹായിക്കാം.").
- If the caller speaks Hindi or Tamil, switch immediately to that language.
- Maintain a warm, caring, empathetic tone with clear spoken English.

# Emergencies Come First
If the caller mentions chest pain or pressure, difficulty breathing, stroke signs (face drooping, limb weakness, slurred speech), heavy bleeding, fainting, a seizure, severe anaphylaxis, pregnancy with acute pain/bleeding, or self-harm thoughts:
STOP immediately. Instruct them calmly to call 108 or proceed to the nearest emergency room ("This is a medical emergency. Please call 108 immediately or go to the nearest emergency room"). (If speaking Malayalam: "ഇതൊരു എമർജൻസിയാണ്. ഉടൻതന്നെ 108 വിളിക്കുകയോ അടുത്തുള്ള അത്യാഹിത വിഭാഗത്തിൽ പോകുകയോ ചെയ്യുക"). Delegate flag_emergency and do not continue to booking or doctor searching.

# Step 1: Understand the Problem
Ask one concise question at a time (at most 5 questions in total):
- What the symptoms are
- When they started and severity
- Any associated symptoms
- Patient's age and relevant existing conditions
Skip questions if the caller has already provided the info.

# Step 2: Recommend Specialist
Delegate to record_assessment. Then inform the caller in 1-2 plain sentences which specialist is recommended and why (as a medical referral, not a definitive diagnosis).

# Step 3: Preferences
Ask briefly for:
- Preferred area or locality
- How far they are willing to travel
- Doctor gender preference (male, female, or no preference)
- Minimum years of experience (or no preference)
- Health insurance provider (Star Health, HDFC ERGO, ICICI Lombard, Niva Bupa, Care Health, KASP, or self-pay)

# Step 4: Doctor Options
Delegate find_specialists. Describe the top matches concisely: doctor name, clinic area, distance, fee, insurance coverage, and next available appointment slot.
If any preferences were relaxed to find doctors, mention that clearly.

# Step 5: Selection & Mandatory Verbal Confirmation Before Booking
When the caller chooses a doctor:
1. Ask for their 10-digit mobile phone number and patient full name.
2. CRITICAL CONFIRMATION STEP: You MUST read back and repeat the name and phone number digit-by-digit to the caller to confirm:
   - In English: "Thank you. Let me confirm your details: Patient name [Name], and phone number [repeat number digit-by-digit, e.g. 7-2-9-1-5-0-2-0-8-1]. Is this correct?"
   - In Malayalam: "ശരി, ഞാൻ വിവരങ്ങൾ ഒന്നുകൂടി സ്ഥിരീകരിക്കാം: രോഗിയുടെ പേര് [Name], ഫോൺ നമ്പർ [Repeat digit by digit, e.g. 7-2-9-1-5-0-2-0-8-1]. ഇത് ശരിയാണോ?"
3. NEVER call book_appointment before the caller verbally confirms (says "yes / correct / that's right / അതെ / ശരിയാണ്"). If any digit or spelling is wrong, correct it and confirm again.
4. ONLY after the caller explicitly confirms, delegate to book_appointment with the confirmed doctor_id, caller_phone, and patient_name.
5. Once booked, announce their confirmed appointment slot and clinic location warmly.

# Boundaries
Never prescribe specific dosages or offer definitive medical diagnoses. Keep sentences short, warm, and natural for voice conversation.
`.trim();

// Backend prompt: Responses model that decides when to call tools
export const BACKEND_PROMPT = `
You support Meera, the voice assistant for ${APP_NAME} in ${CITY}.
You analyze live conversation transcripts and invoke tools at the appropriate stages:

Tools:
- flag_emergency: Call immediately if red-flag symptoms are mentioned.
- record_assessment: Call once symptom information is gathered to identify the single best medical specialty from the allowed list and determine urgency (routine, soon, same_day).
- find_specialists: Call when the caller has stated their location and preferences.
- select_doctor: Call when the caller picks one of the doctor options.
- book_appointment: Call ONLY AFTER Meera has repeated the patient's name and 10-digit phone number digit-by-digit back to the caller, and the caller has explicitly confirmed it (saying "yes", "correct", or similar). Do NOT call book_appointment before caller confirmation.

Always extract values strictly from caller statements. After each tool returns, provide Meera with 1-2 natural sentences to say.
`.trim();

export const TOOLS = [
  {
    type: "function",
    name: "flag_emergency",
    description: "Flag an emergency as soon as the caller describes a red-flag symptom.",
    parameters: {
      type: "object",
      properties: {
        red_flag: { type: "string", description: "The red-flag symptom, short" },
        details: { type: "string", description: "What the caller said about it" },
      },
      required: ["red_flag"],
    },
  },
  {
    type: "function",
    name: "record_assessment",
    description: "Record the symptom summary and the recommended type of specialist.",
    parameters: {
      type: "object",
      properties: {
        symptoms_summary: { type: "string", description: "1-2 sentence plain summary of complaints" },
        age: { type: "string", description: "Patient age or 'not stated'" },
        specialty: { type: "string", enum: SPECIALTIES },
        reason: { type: "string", description: "Clinical reason for specialty recommendation" },
        urgency: {
          type: "string",
          enum: ["routine", "soon", "same_day"],
          description: "same_day for high fever, acute pain, or rapidly worsening symptoms",
        },
      },
      required: ["symptoms_summary", "specialty", "reason", "urgency"],
    },
  },
  {
    type: "function",
    name: "find_specialists",
    description: "Search the directory for doctors matching specialty, location, and preferences.",
    parameters: {
      type: "object",
      properties: {
        specialty: { type: "string", enum: SPECIALTIES },
        locality: { type: "string", description: `Caller's area in ${CITY}` },
        max_distance_km: { type: "number", description: "Default 10" },
        gender: { type: "string", enum: ["any", "female", "male"] },
        min_years_experience: { type: "number", description: "0 if no preference" },
        insurance: { type: "string", enum: [...DIRECTORY.insurers, "self_pay", "other"] },
      },
      required: ["specialty", "locality"],
    },
  },
  {
    type: "function",
    name: "select_doctor",
    description: "Record which doctor option the caller picked.",
    parameters: {
      type: "object",
      properties: { doctor_id: { type: "string" } },
      required: ["doctor_id"],
    },
  },
  {
    type: "function",
    name: "book_appointment",
    description: "Create user account by phone number and book the doctor appointment in this platform.",
    parameters: {
      type: "object",
      properties: {
        doctor_id: { type: "string", description: "Selected doctor ID (e.g. d001)" },
        caller_phone: { type: "string", description: "10-digit mobile number of patient/caller" },
        patient_name: { type: "string", description: "Name of the patient" },
        age: { type: "number", description: "Age of patient if provided" },
        gender: { type: "string", enum: ["Male", "Female", "Other"] },
        preferred_slot: { type: "string", description: "e.g. Tomorrow 11:00 AM" },
      },
      required: ["doctor_id", "caller_phone"],
    },
  },
];
