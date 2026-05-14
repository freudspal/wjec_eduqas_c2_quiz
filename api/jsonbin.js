export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) { body = {}; }
  
  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method provided" });

    // --- 1. SYSTEM DATA (Approved Answers/Learned Bank) ---
    // Links updated to use the main BIN_ID
    if (method === "GET_SYSTEM_DATA") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json({ approvedAnswers: j.record.approvedAnswers || {} });
    }

    if (method === "ADD_APPROVED") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      const data = j.record;
      if (!data.approvedAnswers) data.approvedAnswers = {};
      if (!data.approvedAnswers[body.concept]) data.approvedAnswers[body.concept] = [];
      
      if (!data.approvedAnswers[body.concept].includes(body.answer)) {
        data.approvedAnswers[body.concept].push(body.answer.trim());
        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY },
          body: JSON.stringify(data)
        });
      }
      return res.status(200).json({ ok: true });
    }

    // --- 2. STUDENT DATA ---
    if (method === "GET_STUDENT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      const students = j.record.students || {};
      return res.status(200).json({ student: students[body.name.toLowerCase()] || null });
    }

    if (method === "PUT_STUDENT") {
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r1.json();
      const data = j.record || { students: {}, approvedAnswers: {} };
      data.students[body.student.name.toLowerCase()] = body.student;
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY },
        body: JSON.stringify(data)
      });
      return res.status(200).json({ ok: true });
    }

    // --- 3. TEACHER ADMIN ---
    if (method === "GET_ALL") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json(j.record || { students: {} });
    }

    if (method === "AUTH") {
      return res.status(200).json({ ok: String(body.pin) === String(TEACHER_PIN) });
    }

    // ==========================================
    // METHOD: AI_CHECK (With your custom model order)
    // ==========================================
    if (method === "AI_CHECK") {
      const { concept, target, studentAnswer } = body;
      
      const prompt = `Act as an A-Level Psychology examiner.
        Target Concept: "${concept}"
        Correct Answer/Definition: "${target}"
        Student Answer: "${studentAnswer}"

MARKING RULES:
1. Prioritize MEANING over exact words.
2. Accept synonyms (e.g., "norms" instead of "socially acceptable").
3. If the student captures the core psychological mechanism, mark it TRUE.
4. Only mark FALSE if the answer is factually incorrect.

Respond ONLY in JSON format: {"correct": boolean, "feedback": string}`;

      // YOUR UPDATED MODEL LIST
      const modelPool = [
        "gemini-1.5-flash", // Safety net
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-3-flash-preview",
        "gemini-1.5-flash", // Safety net
      ];

      for (let i = 0; i < modelPool.length; i++) {
        const modelName = modelPool[i];
        const currentTimeout = i === 0 ? 7000 : 5000; 
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), currentTimeout);

        try {
          console.log(`🤖 Attempt ${i+1}: Trying ${modelName}...`);

          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: "application/json" }
            }),
            signal: controller.signal
          });

          const data = await r.json();
          clearTimeout(timeoutId);

          if (!r.ok) {
            console.error(`📡 ${modelName} failed (${r.status})`);
            continue; 
          }

          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          return res.status(200).json(JSON.parse(text.substring(start, end + 1)));

        } catch (err) {
          clearTimeout(timeoutId);
          if (i === modelPool.length - 1) break;
        }
      }

      return res.status(200).json({ 
        correct: false, 
        feedback: "AI is currently slow. Teacher will check manually. 🐾" 
      });
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { 
    console.error("🚨 GLOBAL SERVER ERROR:", err.message);
    return res.status(500).json({ error: err.message }); 
  }
}
