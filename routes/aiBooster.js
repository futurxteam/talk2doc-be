// pages/api/ai-booster.js
import { OpenAI } from "openai";
import { MongoClient } from "mongodb";
import "dotenv/config";

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = "test";
const EMBEDDINGS_COLLECTION = "question_embeddings";

if (!MONGODB_URI) throw new Error("Add MONGODB_URI to .env.local");

let openaiClient = null;
let mongoClient = null;

const getOpenAI = () => {
  if (openaiClient) return openaiClient;
  const useGrok = Boolean(process.env.GROK_API_KEY);
  openaiClient = new OpenAI({
    apiKey: process.env.GROK_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: useGrok ? "https://api.x.ai/v1" : "https://api.openai.com/v1",
  });
  console.log(`AI Booster → ${useGrok ? "Grok" : "OpenAI"}`);
  return openaiClient;
};

const getMongo = async () => {
  if (mongoClient) return mongoClient.db(DB_NAME);
  mongoClient = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  return mongoClient.db(DB_NAME);
};

const MODEL = process.env.GROK_API_KEY ? "grok-beta" : "gpt-4o-mini";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { state, remainingQuestions = [] } = req.body;

    if (!state || !Array.isArray(remainingQuestions) || remainingQuestions.length === 0) {
      return res.json({ question: null });
    }

    const allowedIds = remainingQuestions.map(q => q.id).filter(Boolean);
    const db = await getMongo();
    const col = db.collection(EMBEDDINGS_COLLECTION);
    const ai = getOpenAI();

    // Build context
    const context = `
Chief complaints: ${state.chiefComplaints?.join(", ") || "unknown"}
Body parts: ${state.bodyParts?.join(", ") || "unknown"}
Answers so far: ${Object.entries(state.answers || {})
  .map(([k, v]) => `${k}: ${v}`)
  .join(" | ")}
`.trim();

    // 1. Embedding similarity search (in-memory, no vector index needed)
    let winner = null;
    try {
      const embRes = await ai.embeddings.create({
        model: "text-embedding-3-small",
        input: context,
      });
      const queryVec = embRes.data[0].embedding;

      const docs = await col
        .find({ question_id: { $in: allowedIds }, embedding: { $exists: true } })
        .toArray();

      if (docs.length > 0) {
        let bestScore = -1;
        for (const doc of docs) {
          const vec = doc.embedding;
          const dot = vec.reduce((sum, v, i) => sum + v * queryVec[i], 0);
          const normA = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
          const normB = Math.sqrt(queryVec.reduce((s, v) => s + v * v, 0));
          const score = normA && normB ? dot / (normA * normB) : 0;

          if (score > bestScore) {
            bestScore = score;
            winner = doc.question; // full question object
          }
        }

        if (winner && bestScore > 0.4) {
          console.log(`AI BOOSTER (Embedding) → ${winner.id} (“${winner.text}”) score: ${bestScore.toFixed(3)}`);
          return res.json({ question: winner });
        }
      }
    } catch (e) {
      console.warn("Embedding search failed (normal)", e.message);
    }

    // 2. Fallback: Pure LLM (your original bulletproof method)
    const questionsList = remainingQuestions
      .map(q => `${q.id}: ${q.text}`)
      .join("\n");

    const system = `You are an expert medical triage AI. Pick ONE question from the list below.
Respond ONLY with valid JSON: {"question":{"id":"...","text":"...","type":"...","options":[...]}}`;

    const user = `${context}

Available questions:
${questionsList}

Pick the best one.`;

    const completion = await ai.chat.completions.create({
      model: MODEL,
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "";
    let parsed;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch {
      return res.json({ question: null });
    }

    const selected = parsed.question;
    if (!selected?.id || !allowedIds.includesIdsincludes(selected.id)) {
      return res.json({ question: null });
    }

    const fullQ = remainingQuestions.find(q => q.id === selected.id);
    if (!fullQ) return res.json({ question: null });

    console.log(`AI BOOSTER (LLM) → ${fullQ.id} (“${fullQ.text}”)`);
    return res.json({ question: fullQ });

  } catch (error) {
    console.error("AI Booster error:", error.message);
    return res.status(500).json({ question: null });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };