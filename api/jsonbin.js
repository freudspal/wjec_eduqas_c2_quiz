export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }
  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method" });

    // --- 1. FETCH QUESTIONS & APPROVED LIST ---
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    // --- 2. ADD AI-VERIFIED ANSWER TO DATABASE (SMART LEARNING) ---
    if (method === "ADD_APPROVED") {
      const { concept, answer } = body;
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
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

    // --- 3. STUDENT PROFILE MANAGEMENT ---
    if (method === "GET_STUDENT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const students = (await r.json()).record.students || {};
      return res.status(200).json({ student: students[body.name.toLowerCase()] || null });
    }

    if (method === "PUT_STUDENT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const data = (await r.json()).record || { students: {}, flags: [] };
      data.students[body.student.name.toLowerCase()] = body.student;
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY }, body: JSON.stringify(data) });
      return res.status(200).json({ ok: true });
    }

    // --- 4. TEACHER ACCESS ---
    if (method === "GET_ALL") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      return res.status(200).json((await r.json()).record || {});
    }

    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    // --- 5. RIGOROUS AI MARKING ENGINE ---
    if (method === "AI_CHECK") {
      const prompt = `You are a strict Psychology examiner. 
      The student was given a definition and asked to name the concept.
      Target Concept: "${body.concept}"
      Student Answer: "${body.studentAnswer}"
      
      Instructions: 
      - If they named the concept correctly (even with minor typos), set correct to true.
      - If they named the WRONG concept, set correct to false.
      Respond ONLY in JSON: {"correct": boolean, "feedback": "Short reason"}`;
      
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      const data = await r.json();
      return res.status(200).json(JSON.parse(data.candidates[0].content.parts[0].text));
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
