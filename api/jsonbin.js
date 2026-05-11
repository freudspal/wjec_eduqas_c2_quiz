export default async function handler(req, res) {
  const MASTER_KEY = process.env.MASTER_KEY;
  const BIN_ID = process.env.BIN_ID;
  const QUESTIONS_BIN_ID = process.env.QUESTIONS_BIN_ID;

  
let body = {};

try {
  body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
} catch (e) {
  body = {};
}

const method = body.method || req.query.method;

console.log("RAW BODY:", req.body);
console.log("PARSED BODY:", body);
console.log("METHOD:", method);


  try {

    // =========================
    // GUARD
    // =========================
    if (!method) {
      return res.status(400).json({ error: "No method provided" });
    }

    // =========================
    // GET QUESTIONS
    // =========================
    if (method === "GET_QUESTIONS") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`,
        {
          headers: { "X-Master-Key": MASTER_KEY }
        }
      );

      const text = await r.text();
      console.log("JSONBIN RAW:", text);

      const j = JSON.parse(text);

      return res.status(200).json(j.record || {});
    }

    // =========================
    // PUT QUESTIONS
    // =========================
    if (method === "PUT_QUESTIONS") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": MASTER_KEY
          },
          body: JSON.stringify(body)
        }
      );

      return res.status(200).json(await r.json());
    }

    // =========================
    // GET STUDENT DB
    // =========================
    if (method === "GET") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
        {
          headers: { "X-Master-Key": MASTER_KEY }
        }
      );

      const text = await r.text();
      console.log("DB RAW:", text);

      const j = JSON.parse(text);

      return res.status(200).json(j.record || {});
    }
    // =========================
// GET STUDENT
// =========================
if (method === "GET_STUDENT") {
  const { name } = body;

  const r = await fetch(
    `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
    {
      headers: { "X-Master-Key": MASTER_KEY }
    }
  );

  const j = await r.json();

  const data = j.record || {};
  const students = data.students || {};

  // ✅ KEY LINE
  const student = students[name.toLowerCase()] || null;

  return res.status(200).json({ student });
}

// =========================
// PUT STUDENT
// =========================
if (method === "PUT_STUDENT") {
  const { student } = body;

  // ✅ 1. get current database
  const r1 = await fetch(
    `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
    {
      headers: { "X-Master-Key": MASTER_KEY }
    }
  );

  const j = await r1.json();
  const data = j.record || {};

  // ✅ 2. make sure structure exists
  if (!data.students) data.students = {};
  if (!data.flags) data.flags = [];

  // ✅ 3. save student correctly
  data.students[student.name.toLowerCase()] = student;

  // ✅ 4. write back to bin
  const r2 = await fetch(
    `https://api.jsonbin.io/v3/b/${BIN_ID}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": MASTER_KEY
      },
      body: JSON.stringify(data)
    }
  );

  return res.status(200).json(await r2.json());
}
    // =========================
    // PUT STUDENT DB
    // =========================
    if (method === "PUT") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": MASTER_KEY
          },
          
body: JSON.stringify(body)

        }
      );

      return res.status(200).json(await r.json());
    }

// =========================
// AI CHECK (GEMINI SAFE)
// =========================
if (method === "AI_CHECK") {
  try {
    const { concept, definition, studentAnswer } = body;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    const prompt = `
You are marking an A-level psychology answer.

Concept: ${concept}
Definition: ${definition}
Student answer: ${studentAnswer}

Decide if the answer is conceptually correct.
Accept paraphrasing if meaning is correct.

STRICT RULES:
- Output ONLY valid JSON
- NO text before JSON
- NO text after JSON
- NO markdown formatting

FORMAT EXACTLY:
{"correct": true, "feedback": "short explanation"}
`;

    const r = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-1b-it:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",   // ✅ CRITICAL FIX
          parts: [{ text: prompt }]
        }
      ]
      // ❌ REMOVE generationConfig (it was breaking output)
    })
  }
);


    const data = await r.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("📦 Full Gemini response:", JSON.stringify(data, null, 2));
    // ✅ debugging (keep while testing)
    console.log("🔍 Gemini raw response:", text);

    // ✅ SAFE PARSING (NO risky replacements)
    let parsed = null;

    try {
      let clean = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");

      if (start !== -1 && end !== -1) {
        const jsonString = clean.substring(start, end + 1);
        parsed = JSON.parse(jsonString);
      }

    } catch (e) {
      console.log("❌ JSON parse failed:", e.message);
      console.log("❌ Raw text:", text);
    }

    // ✅ SUCCESS
    if (parsed && typeof parsed.correct !== "undefined") {
      return res.status(200).json(parsed);
    }

    // ✅ FALLBACK RESPONSE (never crashes)
    return res.status(200).json({
      correct: false,
      feedback: "AI response unreadable — fallback used"
    });

  } catch (err) {
    console.error("🚨 AI ERROR:", err);

    // ✅ NEVER break the API
    return res.status(200).json({
      correct: false,
      feedback: "AI failed — fallback used"
    });
  }
}

// =========================
// AUTH TEACHER
// =========================
if (method === "AUTH") {
  const { pin } = body;

  const TEACHER_PIN = process.env.TEACHER_PIN;

  // optional safety: ensure both are strings
  const ok = String(pin) === String(TEACHER_PIN);

  return res.status(200).json({ ok });
}

    // =========================
    // FALLBACK
    // =========================
    return res.status(400).json({
      error: "Invalid method",
      received: method
    });

  } catch (err) {
    console.error("CRASH:", err);
    return res.status(500).json({
      error: "Server crashed",
      message: err.message
    });
  }
}
