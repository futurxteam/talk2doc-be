import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

let openai = null;
const getOpenAIClient = () => {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

/**
 * POST /api/voice/tts
 * Body: { text: string, voice?: string, language?: string }
 * Streams/sends audio/mpeg synthesized by OpenAI TTS.
 */
export const generateTTS = async (req, res) => {
  try {
    const { text, voice = "nova" } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text is required for TTS synthesis" });
    }

    const client = getOpenAIClient();

    // Use tts-1 for low-latency, natural conversational speech
    // Selected voices like 'nova', 'shimmer', 'alloy' handle English & Malayalam well
    const mp3Response = await client.audio.speech.create({
      model: "tts-1",
      voice: voice || "nova",
      input: text.trim().slice(0, 4096), // OpenAI limit
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "no-cache",
    });

    return res.end(buffer);
  } catch (error) {
    console.error("OpenAI TTS Generation Error:", error?.message || error);
    return res.status(500).json({
      error: "TTS Generation Failed",
      details: error?.message || "Unknown error",
    });
  }
};
