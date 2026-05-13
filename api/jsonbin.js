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
