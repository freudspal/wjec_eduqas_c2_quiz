export default async function handler(req, res) {
  const MASTER_KEY = process.env.MASTER_KEY;
  const BIN_ID = process.env.BIN_ID;
  const QUESTIONS_BIN_ID = process.env.QUESTIONS_BIN_ID;

  const method = req.body?.method || req.query.method;

  try {

    // =========================
    // QUESTIONS
    // =========================
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    if (method === "PUT_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY
        },
        body: JSON.stringify(req.body)
      });
      return res.status(200).json(await r.json());
    }

    // =========================
    // FULL DATABASE
    // =========================
    if (method === "GET") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    if (method === "PUT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY
        },
        body: JSON.stringify(req.body)
      });
      return res.status(200).json(await r.json());
    }

    // =========================
    // STUDENT
    // =========================
    if (method === "GET_STUDENT") {
      const db = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      }).then(r => r.json());

      const students = db.record?.students || {};
      const student = students[req.body.name];

      return res.status(200).json({ student });
    }

    if (method === "PUT_STUDENT") {
      const dbRes = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const db = await dbRes.json();

      const record = db.record || {};
      record.students = record.students || {};

      const s = req.body.student;
      record.students[s.name] = s;

      const save = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY
        },
        body: JSON.stringify(record)
      });

      return res.status(200).json(await save.json());
    }

    // =========================
    // AUTH (teacher)
    // =========================
    if (method === "AUTH") {
      const pin = req.body.pin;

      const ok = pin === process.env.TEACHER_PIN;

      return res.status(200).json({ ok });
    }

    // =========================
    // AI CHECK (Gemini)
    // =========================
    if (method === "AI_CHECK") {
      const KEY = process.env.GEMINI_API_KEY;

      const { concept, definition, studentAnswer } = req.body;

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{
                  text: `Mark this answer. Say "correct" or "incorrect".

Concept: ${concept}
Definition: ${definition}
Answer: ${studentAnswer}`
                }]
              }
            ]
          })
        }
      );

      const j = await r.json();
      const txt = j.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const correct = txt.toLowerCase().includes("correct");

      return res.status(200).json({
        correct,
        feedback: txt
      });
    }

    // =========================
    // FALLBACK
    // =========================
    return res.status(400).json({
      error: "Invalid method",
      received: method
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
