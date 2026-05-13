export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch (e) { body = {}; }
  
  const method = body.method || req.query.method;

  try {
    if (!method) return res.status(400).json({ error: "No method provided" });

    // --- 1. QUESTIONS & SMART LEARNING ---
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      return res.status(200).json(j.record || { questions: [], approvedAnswers: {} });
    }

    if (method === "ADD_APPROVED") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const j = await r.json();
      const data = j.record;
      if (!data.approvedAnswers) data.approvedAnswers = {};
      if (!data.approvedAnswers[body.concept]) data.approvedAnswers[body.concept] = [];
      
      if (!data.approvedAnswers[body.concept].includes(body.answer)) {
        data.approvedAnswers[body.concept].push(body.answer.trim());
        await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`, {
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
      const data = j.record || { students: {} };
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
    // METHOD: AI_CHECK (Integrated Working Code)
    // ==========================================
   if (method === "AI_CHECK") {
      try {
        const { concept, target, studentAnswer } = body;
        
        const prompt = `You are an A-Level Psychology examiner.
        Topic: "${concept}"
        Correct Definition/Target: "${target}"
        Student's Answer: "${studentAnswer}"

        Rule: If the student describes the core meaning correctly (even with poor spelling or different words), mark it true.
        
        Respond ONLY in this JSON format:
        {"correct": true, "feedback": "Brief explanation"}
        OR
        {"correct": false, "feedback": "Explanation"}`;

        console.log(`🤖 [AI_CHECK] Request for: ${concept} using Gemma-4`);

        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ 
              role: "user", 
              parts: [{ text: prompt }] 
            }],
            // We keep JSON mode, but Gemma might still add "Thinking" text
            generationConfig: { response_mime_type: "application/json" }
          })
        });

        const data = await r.json();
        
        if (!r.ok) {
            console.error("📡 Gemini/Gemma API Error:", JSON.stringify(data));
            throw new Error(`Google Status ${r.status}`);
        }

        // --- NEW ROBUST PARSING LOGIC ---
        let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        // 1. Log raw text to Vercel so you can see the "Thinking" process
        console.log("📝 Raw AI Output:", rawText);

        // 2. Find the first '{' and last '}' to strip away the AI's "thinking" notes
        const start = rawText.indexOf('{');
        const end = rawText.lastIndexOf('}');
        
        if (start === -1 || end === -1) {
          throw new Error("AI did not return any JSON structure");
        }

        const cleanJson = rawText.substring(start, end + 1);
        
        // 3. Parse the cleaned JSON
        const parsedResult = JSON.parse(cleanJson);

        return res.status(200).json(parsedResult);

      } catch (aiErr) {
        console.error("🚨 AI CRITICAL ERROR:", aiErr.message);
        return res.status(200).json({ 
          correct: false, 
          feedback: "AI Reasoning failed. Teacher will review your answer." 
        });
      }
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { 
    console.error("GLOBAL SERVER ERROR:", err.message);
    return res.status(500).json({ error: err.message }); 
  }
}
