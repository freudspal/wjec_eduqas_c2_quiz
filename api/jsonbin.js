export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }
  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method" });

    // --- 1. QUESTIONS & DATA ---
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json(j.record || { questions: [], approvedAnswers: {} });
    }

    if (method === "GET_STUDENT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      const students = j.record.students || {};
      return res.status(200).json({ student: students[body.name.toLowerCase()] || null });
    }

    if (method === "PUT_STUDENT") {
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r1.json();
      const data = j.record || { students: {} };
      data.students[body.student.name.toLowerCase()] = body.student;
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY }, body: JSON.stringify(data) });
      return res.status(200).json({ ok: true });
    }

    if (method === "ADD_APPROVED") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const data = (await r.json()).record;
      if (!data.approvedAnswers) data.approvedAnswers = {};
      if (!data.approvedAnswers[body.concept]) data.approvedAnswers[body.concept] = [];
      if (!data.approvedAnswers[body.concept].includes(body.answer)) {
        data.approvedAnswers[body.concept].push(body.answer.trim());
        await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY }, body: JSON.stringify(data) });
      }
      return res.status(200).json({ ok: true });
    }

    if (method === "GET_ALL") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      return res.status(200).json((await r.json()).record || { students: {} });
    }

    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    // ==========================================
    // METHOD: AI_CHECK (FIXED GEMINI CALL)
    // ==========================================
    if (method === "AI_CHECK") {
      try {
        const prompt = `Strict Psychology Examiner. Concept: "${body.concept}". Student said: "${body.studentAnswer}". Task: Mark as conceptually correct? Accept minor typos/variations. Return JSON ONLY: {"correct":boolean, "feedback":string}`;
        
        // Changed endpoint from v1beta to v1
        const r = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        if (!r.ok) {
          throw new Error(`Google API Error: ${r.status}`);
        }

        const data = await r.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{"correct":false,"feedback":"AI Error"}';
        return res.status(200).json(JSON.parse(text));
        
      } catch (aiErr) {
        console.error("AI Inner Error:", aiErr);
        // If AI fails, return a safe "False" instead of crashing the server
        return res.status(200).json({ 
          correct: false, 
          feedback: "AI Marking temporarily unavailable. Teacher will review." 
        });
      }
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { 
    console.error("Global API Error:", err);
    return res.status(500).json({ error: "Server crashed", details: err.message }); 
  }
}
