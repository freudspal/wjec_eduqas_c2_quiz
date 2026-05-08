// PsychQuiz — Vercel API Proxy
// Env vars: BIN_ID, MASTER_KEY, TEACHER_PIN, GEMINI_API_KEY
// Optional: QUESTIONS_BIN_ID (second bin for questions database)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function parseBody(req) {
  try { return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return {}; }
}

async function readBin(binId, masterKey) {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
    headers: { 'X-Master-Key': masterKey },
  });
  if (!r.ok) throw new Error(`JSONBin read failed: ${r.status}`);
  const d = await r.json();
  return d.record || {};
}

async function writeBin(binId, masterKey, record) {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Master-Key': masterKey },
    body: JSON.stringify(record),
  });
  if (!r.ok) throw new Error(`JSONBin write failed: ${r.status}`);
  return true;
}

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BIN_ID           = process.env.BIN_ID;
  const MASTER_KEY       = process.env.MASTER_KEY;
  const TEACHER_PIN      = process.env.TEACHER_PIN;
  const GEMINI_API_KEY       = process.env.GEMINI_API_KEY;
  const QUESTIONS_BIN_ID = process.env.QUESTIONS_BIN_ID;

  if (!BIN_ID || !MASTER_KEY) {
    return res.status(500).json({ error: 'Missing BIN_ID or MASTER_KEY env vars' });
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const op  = url.searchParams.get('method');

  try {

    // ── AUTH ────────────────────────────────────────────────────────────────
    if (op === 'AUTH') {
      const { pin } = parseBody(req);
      if (pin && TEACHER_PIN && String(pin).trim() === String(TEACHER_PIN).trim()) {
        return res.status(200).json({ ok: true });
      }
      return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
    }

    // ── GET ─────────────────────────────────────────────────────────────────
    if (op === 'GET') {
      const record = await readBin(BIN_ID, MASTER_KEY);
      return res.status(200).json(record);
    }

    // ── PUT ─────────────────────────────────────────────────────────────────
    if (op === 'PUT') {
      await writeBin(BIN_ID, MASTER_KEY, parseBody(req));
      return res.status(200).json({ ok: true });
    }

    // ── GET_STUDENT ─────────────────────────────────────────────────────────
    if (op === 'GET_STUDENT') {
      const { name } = parseBody(req);
      if (!name) return res.status(400).json({ error: 'name required' });
      const record = await readBin(BIN_ID, MASTER_KEY);
      return res.status(200).json({ student: (record.students || {})[name] || null });
    }

    // ── PUT_STUDENT ─────────────────────────────────────────────────────────
    if (op === 'PUT_STUDENT') {
      const { student } = parseBody(req);
      if (!student?.name) return res.status(400).json({ error: 'student.name required' });
      const record = await readBin(BIN_ID, MASTER_KEY);
      record.students = record.students || {};
      record.students[student.name] = student;
      await writeBin(BIN_ID, MASTER_KEY, record);
      return res.status(200).json({ ok: true });
    }

    // ── GET_QUESTIONS ───────────────────────────────────────────────────────
    if (op === 'GET_QUESTIONS') {
      if (!QUESTIONS_BIN_ID) {
        return res.status(200).json({ questions: null, approvedAnswers: {} });
      }
      const record = await readBin(QUESTIONS_BIN_ID, MASTER_KEY);
      return res.status(200).json({
        questions: record.questions || null,
        approvedAnswers: record.approvedAnswers || {},
      });
    }

    // ── PUT_QUESTIONS ───────────────────────────────────────────────────────
    if (op === 'PUT_QUESTIONS') {
      if (!QUESTIONS_BIN_ID) {
        return res.status(400).json({ error: 'QUESTIONS_BIN_ID not set' });
      }
      const existing = await readBin(QUESTIONS_BIN_ID, MASTER_KEY).catch(() => ({}));
      await writeBin(QUESTIONS_BIN_ID, MASTER_KEY, { ...existing, ...parseBody(req) });
      return res.status(200).json({ ok: true });
    }

    // ── AI_CHECK via Google Gemini ──────────────────────────────────────────
    if (op === 'AI_CHECK') {
      if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY not set in Vercel env vars' });
      }

      const { concept, definition, studentAnswer, questionType, approved } = parseBody(req);
      if (!studentAnswer || !definition) {
        return res.status(400).json({ error: 'studentAnswer and definition required' });
      }

      const approvedLine = approved?.length
        ? `\nTeacher-approved alternative answers (treat as fully correct): ${approved.join(' | ')}`
        : '';

      let prompt = '';

      if (questionType === 'definition') {
        prompt = `You are a supportive A-level Psychology teacher marking a definition answer.

Concept: "${concept}"
Official definition: "${definition}"${approvedLine}
Student's answer: "${studentAnswer}"

MARKING RULES — be generous:
- Award CORRECT if the student shows understanding of the core idea, even if wording differs
- Accept synonyms, paraphrasing, and informal language freely
- Do NOT require specific wording unless it IS the core concept
- Award CORRECT for partial answers that capture the main point
- Only mark INCORRECT if the answer shows clear misunderstanding or is completely off-topic
- When in doubt, mark CORRECT

Reply with JSON only, no other text:
{"correct": true, "feedback": "One encouraging sentence affirming what they got right."}
or
{"correct": false, "feedback": "One gentle sentence pointing to the key idea they missed."}`;

      } else if (questionType === 'scenario') {
        prompt = `You are a supportive A-level Psychology teacher marking a scenario question.

Scenario: "${concept}"
Key concept being tested: "${definition}"${approvedLine}
Student's answer: "${studentAnswer}"

MARKING RULES — be generous:
- Award CORRECT if the student identifies the relevant concept or shows relevant understanding
- Accept informal explanations and partial answers
- Do NOT require textbook wording
- Only mark INCORRECT if the answer is clearly wrong or entirely irrelevant

Reply with JSON only:
{"correct": true/false, "feedback": "One encouraging sentence."}`;

      } else {
        // eval strength/weakness
        prompt = `You are a supportive A-level Psychology teacher marking an evaluation point.

Being evaluated: "${concept}"
Expected points: "${definition}"${approvedLine}
Student's answer: "${studentAnswer}"

MARKING RULES — be generous:
- Award CORRECT if the student makes any valid, relevant point
- Accept any reasonable strength or weakness, even if not on the mark scheme
- Informal language is fine
- Only mark INCORRECT if clearly wrong or irrelevant

Reply with JSON only:
{"correct": true/false, "feedback": "One encouraging sentence."}`;
      }

      // Call Gemini API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,      // low temp = consistent marking
            maxOutputTokens: 150,
          },
        }),
      });

      if (!geminiRes.ok) {
        const err = await geminiRes.text();
        console.error('Gemini error:', err);
        return res.status(500).json({ error: 'AI check failed', detail: err });
      }

      const geminiData = await geminiRes.json();
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();

      try {
        const result = JSON.parse(clean);
        return res.status(200).json(result);
      } catch {
        // If JSON parse fails, extract true/false from text
        const correct = clean.toLowerCase().includes('"correct": true') ||
                        clean.toLowerCase().includes('"correct":true');
        return res.status(200).json({ correct, feedback: 'Answer checked.' });
      }
    }

    return res.status(400).json({ error: `Unknown method: ${op}` });

  } catch (err) {
    console.error('CRASH:', err.message);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
