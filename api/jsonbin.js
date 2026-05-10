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
// AI CHECK (GEMINI)
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

IMPORTANT RULES:
- Output ONLY valid JSON
- NO text before JSON
- NO text after JSON
- NO markdown
- NO explanations outside JSON

Correct format:
{"correct": true, "feedback": "short explanation"}
`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

const data = await r.json();

const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ✅ NEW SAFE PARSE (handles messy Gemini output)

// ✅ ADD THIS (new debugging)
console.log("🔍 Gemini raw response:", text);

// ✅ REPLACE EVERYTHING BELOW THIS WITH NEW PARSER
let parsed = null;

try {
  let clean = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const jsonStart = clean.indexOf("{");
  const jsonEnd = clean.lastIndexOf("}");

  if (jsonStart !== -1 && jsonEnd !== -1) {
    clean = clean.substring(jsonStart, jsonEnd + 1);

    // ✅ Fix common issues
    clean = clean
      .replace(/(\w+):/g, '"$1":')  // fix unquoted keys
      .replace(/'/g, '"');         // fix single quotes

    parsed = JSON.parse(clean);
  }

} catch (e) {
  console.log("❌ JSON parse failed:", e);
  console.log("❌ Raw text was:", text);
}

// ✅ FINAL CHECK
if (parsed && typeof parsed.correct !== "undefined") {
  return res.status(200).json(parsed);
}

// ✅ FALLBACK IF PARSE FAILS
return res.status(200).json({
  correct: false,
  feedback: "AI response format issue — using fallback"
});

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
