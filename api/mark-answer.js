export default async function handler(req, res) {
  const KEY = process.env.GEMINI_API_KEY;

  const { question, studentAnswer } = req.body;

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Mark out of 5. Say if correct.

Question: ${question}
Answer: ${studentAnswer}`
              }
            ]
          }
        ]
      })
    }
  );

  const j = await r.json();

  const text =
    j.candidates?.[0]?.content?.parts?.[0]?.text || "";

  res.status(200).json({ result: text });
}
