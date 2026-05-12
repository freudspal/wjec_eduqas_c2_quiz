export default async function handler(req, res) {
  // 1. Environment Variables (Set these in Vercel Dashboard)
  const MASTER_KEY = process.env.MASTER_KEY;
  const BIN_ID = process.env.BIN_ID; // Your Student DB Bin
  const QUESTIONS_BIN_ID = process.env.QUESTIONS_BIN_ID; // Your Questions/Approved Answers Bin
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const TEACHER_PIN = process.env.TEACHER_PIN;

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
    // Fetches the questions array and the library of approved answers
    // ==========================================
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    // ==========================================
    // METHOD: ADD_APPROVED
    // Adds a student's answer to the "Auto-Correct" list if AI approved it
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
      
      // Normalize and check for duplicates
      const cleanAns = answer.trim().toLowerCase();
      if (!data.approvedAnswers[concept].some(a => a.toLowerCase() === cleanAns)) {
        data.approvedAnswers[concept].push(answer.trim());
        
        await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json", 
            "X-Master-Key": MASTER_KEY 
          },
          body: JSON.stringify(data)
        });
      }
      return res.status(200).json({ ok: true });
    }

    // ==========================================
    // METHOD: GET_STUDENT
    // Fetches a specific student's profile by name
    // ==========================================
    if (method === "GET_STUDENT") {
      const { name } = body;
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      const students = j.record.students || {};
      const student = students[name.toLowerCase()] || null;
      return res.status(200).json({ student });
    }

    // ==========================================
    // METHOD: PUT_STUDENT
    // Saves or updates a student profile (preserves other students)
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
        headers: { 
          "Content-Type": "application/json", 
          "X-Master-Key": MASTER_KEY 
        },
        body: JSON.stringify(data)
      });
      return res.status(200).json({ ok: true });
    }

    // ==========================================
    // METHOD: SUBMIT_FLAG
    // Records an error report from a student for the teacher to review
    // ==========================================
    if (method === "SUBMIT_FLAG") {
      const { flag } = body;
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r1.json();
      const data = j.record || { students: {}, flags: [] };
      
      if (!data.flags) data.flags = [];
      data.flags.push({ 
        ...flag, 
        id: Date.now(), 
        status: "pending",
        timestamp: new Date().toISOString()
      });

      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          "X-Master-Key": MASTER_KEY 
        },
        body: JSON.stringify(data)
      });
      return res.status(200).json({ ok: true });
    }

    // ==========================================
    // METHOD: AI_CHECK
    // Uses Google Gemini 1.5 Flash to mark open-ended answers
    // ==========================================
    if (method === "AI_CHECK") {
      const { concept, definition, studentAnswer } = body;
      
      const prompt = `You are an A-Level Psychology examiner.
      Topic: "${concept}"
      Correct Definition: "${definition}"
      Student's Answer: "${studentAnswer}"

      Rule: If the student describes the core meaning correctly (even with poor spelling or different words), mark it true.
      
      Respond ONLY in this JSON format:
      {"correct": true, "feedback": "Brief explanation of why"}
      OR
      {"correct": false, "feedback": "Explain what they missed"}`;

      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      
      const data = await r.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{"correct": false, "feedback": "AI Service Unavailable"}';
      
      return res.status(200).json(JSON.parse(text));
    }

    // ==========================================
    // METHOD: AUTH
    // Verifies the teacher's secret PIN
    // ==========================================
    if (method === "AUTH") {
      const ok = String(body.pin) === String(TEACHER_PIN);
      return res.status(200).json({ ok });
    }

    // Default Fallback
    return res.status(400).json({ error: "Method not recognized" });

  } catch (err) {
    console.error("Server Crash:", err);
    return res.status(500).json({ 
      error: "Critical Server Error", 
      message: err.message 
    });
  }
}
