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
    // ==========================================
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || { questions: [], approvedAnswers: {} });
    }

    // ==========================================
    // METHOD: GET_STUDENT
    // ==========================================
    if (method === "GET_STUDENT") {
      const { name } = body;
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      const students = j.record.students || {};
      return res.status(200).json({ student: students[name.toLowerCase()] || null });
    }

    // ==========================================
    // METHOD: PUT_STUDENT
    // ==========================================
    if (method === "PUT_STUDENT") {
      const { student } = body;
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r1.json();
      const data = j.record || { students: {} };
      
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
    // METHOD: ADD_APPROVED (Smart Learning)
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
    // METHOD: GET_ALL (Teacher View)
    // ==========================================
    if (method === "GET_ALL") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { "X-Master-Key": MASTER_KEY }
      });
      const j = await r.json();
      return res.status(200).json(j.record || { students: {} });
    }

    // ==========================================
    // METHOD: AUTH
    // ==========================================
    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    // ==========================================
    // METHOD: AI_CHECK (Gemini 1.5 Flash Fix)
    // ==========================================
    if (method === "AI_CHECK") {
      try {
        const prompt = `Strict Psychology Examiner. Concept to identify: "${body.concept}". Student wrote: "${body.studentAnswer}". Instruction: Is this correctly identified? Minor typos okay. Return ONLY JSON: {"correct":boolean, "feedback":string}`;
        
        const r = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }]
              }
            ]
          })
        });

        const data = await r.json();

        if (!r.ok) {
          console.error("Google Error Detail:", JSON.stringify(data));
          throw new Error(`Google API Status ${r.status}`);
        }

        // Clean any markdown backticks the AI might include
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        return res.status(200).json(JSON.parse(cleanJson));
        
      } catch (aiErr) {
        console.error("AI Inner Error:", aiErr);
        // Safe fallback so student can continue
        return res.status(200).json({ 
          correct: false, 
          feedback: "AI Busy. Teacher will review your answer." 
        });
      }
    }

    return res.status(400).json({ error: "Invalid method" });

  } catch (err) {
    console.error("Global API Error:", err);
    return res.status(500).json({ error: "Server crashed", details: err.message });
  }
}
