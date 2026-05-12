export default async function handler(req, res) {
  // 1. Environment Variables
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  // 2. Safe Body Parsing
  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    body = {};
  }

  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method provided" });

    // ==========================================
    // METHOD: GET_QUESTIONS
    // Fetches the questions array and approved answers
    // ==========================================
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    // ==========================================
    // METHOD: GET_STUDENT (The one you were looking for)
    // Used for Login and Teacher Drill-down
    // ==========================================
    if (method === "GET_STUDENT") {
      const { name } = body;
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      const students = j.record.students || {};
      // Return student if found, otherwise return null
      return res.status(200).json({ student: students[name.toLowerCase()] || null });
    }

    // ==========================================
    // METHOD: PUT_STUDENT
    // Saves or updates a student profile
    // ==========================================
    if (method === "PUT_STUDENT") {
      const { student } = body;
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r1.json();
      const data = j.record || { students: {}, flags: [] };
      
      if (!data.students) data.students = {};
      data.students[student.name.toLowerCase()] = student;

      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY },
        body: JSON.stringify(data)
      });
      return res.status(200).json({ ok: true });
    }

    // ==========================================
    // METHOD: ADD_APPROVED
    // "Smart Learning" - AI saves new correct wordings to DB
    // ==========================================
    if (method === "ADD_APPROVED") {
      const { concept, answer } = body;
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      const data = j.record;

      if (!data.approvedAnswers) data.approvedAnswers = {};
      if (!data.approvedAnswers[concept]) data.approvedAnswers[concept] = [];
      
      const cleanAns = answer.trim().toLowerCase();
      if (!data.approvedAnswers[concept].some(a => a.toLowerCase() === cleanAns)) {
        data.approvedAnswers[concept].push(answer.trim());
        await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY },
          body: JSON.stringify(data)
        });
      }
      return res.status(200).json({ ok: true });
    }

    // ==========================================
    // METHOD: GET_ALL
    // Teacher access: Fetch all students
    // ==========================================
    if (method === "GET_ALL") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    // ==========================================
    // METHOD: AUTH
    // Verify Teacher PIN
    // ==========================================
    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    // ==========================================
    // METHOD: AI_CHECK
    // Gemini 1.5 Flash - Rigorous Marking Engine
    // ==========================================
    if (method === "AI_CHECK") {
      const { concept, target, studentAnswer, type } = body;
      
      const prompt = `Strict Psychology Examiner Mode. 
      Task Type: ${type}.
      Target correct concept name: "${concept}".
      Student wrote: "${studentAnswer}".
      Rule: Do they identify THIS specific concept correctly? Accept minor typos, but reject if they describe a different concept.
      Return ONLY valid JSON: {"correct": boolean, "feedback": "Short reason"}`;

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{"correct": false, "feedback": "AI Error"}';
      return res.status(200).json(JSON.parse(text));
    }

    return res.status(400).json({ error: "Invalid method" });

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ error: "Server Error", message: err.message });
  }
}
