export default async function handler(req, res) {
  const { MASTER_KEY, BIN_ID, QUESTIONS_BIN_ID, GEMINI_API_KEY, TEACHER_PIN } = process.env;
  let body = {};
  try { body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {}); } catch (e) { body = {}; }
  const method = body.method || req.query.method;

  try {
    if (method === "GET_QUESTIONS") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      return res.status(200).json((await r.json()).record);
    }
    if (method === "GET_STUDENT") {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const students = (await r.json()).record.students || {};
      return res.status(200).json({ student: students[body.name.toLowerCase()] || null });
    }
    if (method === "PUT_STUDENT") {
      const r1 = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, { headers: { "X-Master-Key": MASTER_KEY } });
      const data = (await r1.json()).record;
      data.students[body.student.name.toLowerCase()] = body.student;
      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Master-Key": MASTER_KEY }, body: JSON.stringify(data) });
      return res.status(200).json({ ok: true });
    }
    if (method === "AI_CHECK") {
      const prompt = `Strict Psychology Examiner. Concept: "${body.concept}". Student said: "${body.studentAnswer}". Instruction: Accept minor typos. Reject wrong concepts. Respond ONLY JSON: {"correct":boolean, "feedback":string}`;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } })
      });
      const data = await r.json();
      return res.status(200).json(JSON.parse(data.candidates[0].content.parts[0].text));
    }
    return res.status(400).json({ error: "Invalid Method" });
  } catch (err) { return res.status(500).json({ error: err.message }); }
}
