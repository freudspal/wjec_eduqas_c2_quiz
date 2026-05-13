export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }
  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method" });

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
      const j = await r1.json();
      const data = j.record || { students: {} };
      data.students[body.student.name.toLowerCase()] = body.student;
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY }, body: JSON.stringify(data) });
      return res.status(200).json({ ok: true });
    }

    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    if (method === "AI_CHECK") {
      try {
        const prompt = `Strict Psychology Examiner. 
        Target Concept: "${body.target}"
        Student Answer: "${body.studentAnswer}"
        Instruction: Is this correct? Accept singular/plural variations and minor typos. 
        Respond ONLY in JSON format: {"correct": boolean, "feedback": "reason"}`;

        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
        });

        const data = await r.json();
        let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        // --- ROBUST JSON EXTRACTION ---
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("AI returned non-JSON text");
        const cleanJson = rawText.substring(start, end + 1);
        
        return res.status(200).json(JSON.parse(cleanJson));
      } catch (e) {
        console.error("AI Error:", e.message);
        return res.status(200).json({ correct: false, feedback: "AI busy. Casing/pluralization error?" });
      }
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
