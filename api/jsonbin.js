export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }
  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method" });

    // --- DATA METHODS ---
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json(j.record || {});
    }

    if (method === "GET_STUDENT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      const students = j.record.students || {};
      return res.status(200).json({ student: students[body.name.toLowerCase()] || null });
    }

    if (method === "GET_ALL") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json(j.record || { students: {} });
    }

    if (method === "PUT_STUDENT") {
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const data = (await r1.json()).record || { students: {} };
      data.students[body.student.name.toLowerCase()] = body.student;
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { 
        method: "PUT", 
        headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY }, 
        body: JSON.stringify(data) 
      });
      return res.status(200).json({ ok: true });
    }

    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    // --- AI MARKING (STABILIZED) ---
    if (method === "AI_CHECK") {
      try {
        const prompt = `You are a strict Psychology examiner. 
        Target Concept/Answer: "${body.target}"
        Student Answer: "${body.studentAnswer}"
        Context: The student is answering a question of type ${body.type}.
        
        Rule: If the meaning is semantically the same (e.g. "highest minus lowest" vs "difference between high and low"), mark true.
        Respond ONLY in JSON format: {"correct": boolean, "feedback": "Short explanation"}`;

        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          })
        });

        const data = await r.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        // Clean markdown if present
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);
        return res.status(200).json(parsed);
      } catch (e) {
        console.error("AI Error:", e);
        return res.status(200).json({ correct: false, feedback: "AI busy. Try again or ask teacher." });
      }
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
