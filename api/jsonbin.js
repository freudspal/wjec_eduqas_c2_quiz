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
    // METHOD: AI_CHECK (With Model Fallback Chain)
    // ==========================================
    if (method === "AI_CHECK") {
      const { concept, target, studentAnswer } = body;
      
      const prompt = `You are an A-Level Psychology examiner.
        Topic: "${concept}"
        Correct Definition/Target: "${target}"
        Student's Answer: "${studentAnswer}"

        Rule: If the student describes the core meaning correctly (even with poor spelling or different words), mark it true.
        
        Respond ONLY in this JSON format:
        {"correct": true, "feedback": "Brief explanation of why"}
        OR
        {"correct": false, "feedback": "Explain what they missed"}`;

      // THE FALLBACK LIST
      const modelPool = [
        "gemini-2.0-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-3-flash-preview"
      ];

      for (let i = 0; i < modelPool.length; i++) {
        const modelName = modelPool[i];
        try {
          console.log(`🤖 [AI_CHECK] Attempt ${i+1}: Trying ${modelName}`);

          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              contents: [{ 
                role: "user", 
                parts: [{ text: prompt }] 
              }],
              generationConfig: { response_mime_type: "application/json" }
            })
          });

          const data = await r.json();

          // If this model is busy or errors out, move to the next one
          if (!r.ok) {
            console.error(`📡 ${modelName} failed (Status ${r.status}). Trying next...`);
            continue; 
          }

          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Robust JSON extraction in case model adds chatter
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          const cleanJson = text.substring(start, end + 1);
          const parsedResult = JSON.parse(cleanJson);

          console.log(`✅ Success with ${modelName}. Verdict:`, parsedResult.correct);
          return res.status(200).json(parsedResult);

        } catch (err) {
          console.error(`❌ ${modelName} Error:`, err.message);
          // If it's the last model, we give up and trigger the catch block below
          if (i === modelPool.length - 1) throw new Error("All AI models busy.");
        }
      }

      // Default safe response if for some reason the loop ends
      return res.status(200).json({ correct: false, feedback: "AI busy. Teacher will review manually." });
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { 
    console.error("🚨 CRITICAL SYSTEM ERROR:", err.message);
    return res.status(200).json({ 
      correct: false, 
      feedback: "AI Marking temporarily unavailable. Teacher will review." 
    }); 
  }
}
