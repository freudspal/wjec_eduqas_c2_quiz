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
    // METHOD: AI_CHECK (Rebuilt with 7s Timeout & Fallbacks)
    // ==========================================
    if (method === "AI_CHECK") {
      const { concept, target, studentAnswer } = body;
      
      const prompt = `Act as an A-Level Psychology examiner.
        Target Concept: "${concept}"
        Correct Answer/Definition: "${target}"
        Student Answer: "${studentAnswer}"

        Mark true if the student identifies the concept or describes it correctly. Accept paraphrasing.
        Respond ONLY in JSON: {"correct": true, "feedback": "Short reason"}`;

      // OPTIMIZED FALLBACK LIST
      const modelPool = [
        "gemini-1.5-flash",      // 1. Most stable and fastest
        "gemini-2.0-flash-exp",  // 2. High intelligence fallback
        "gemini-3.1-flash-lite"  // 3. Newest fallback
      ];

      for (let i = 0; i < modelPool.length; i++) {
        const modelName = modelPool[i];
        
        // Timeout: 7s for first try, 5s for fallbacks to save time
        const currentTimeout = i === 0 ? 7000 : 5000; 
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), currentTimeout);

        try {
          console.log(`🤖 [AI_CHECK] Trying ${modelName} (${currentTimeout/1000}s limit)...`);

          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              contents: [{ 
                role: "user", 
                parts: [{ text: prompt }] 
              }],
              generationConfig: { 
                response_mime_type: "application/json" 
              }
            }),
            signal: controller.signal
          });

          const data = await r.json();
          clearTimeout(timeoutId);

          if (!r.ok) {
            console.error(`📡 ${modelName} failed (Status ${r.status}). Trying next...`);
            continue; 
          }

          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Robust extraction of JSON from text
          const start = text.indexOf('{');
          const end = text.lastIndexOf('}');
          if (start === -1 || end === -1) throw new Error("No JSON found");
          
          const cleanJson = text.substring(start, end + 1);
          const parsedResult = JSON.parse(cleanJson);

          console.log(`✅ Success with ${modelName}. Verdict:`, parsedResult.correct);
          return res.status(200).json(parsedResult);

        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            console.error(`⏱️ [TIMEOUT] ${modelName} took too long. Skipping...`);
          } else {
            console.error(`❌ ${modelName} Error:`, err.message);
          }
          // If this was the last model, we break and hit the final fallback below
          if (i === modelPool.length - 1) break;
        }
      }

      // FINAL FALLBACK (If all AI models are busy or slow)
      return res.status(200).json({ 
        correct: false, 
        feedback: "The cat is thinking slowly! Your answer is saved for teacher review. 🐾" 
      });
    }

    return res.status(400).json({ error: "Invalid method" });
  } catch (err) { 
    console.error("🚨 GLOBAL SERVER ERROR:", err.message);
    return res.status(500).json({ 
      error: "Server encountered an error", 
      details: err.message 
    }); 
  }
}
