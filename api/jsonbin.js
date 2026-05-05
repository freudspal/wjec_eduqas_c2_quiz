const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  console.log('FUNCTION START');

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BIN_ID = process.env.BIN_ID;
  const MASTER_KEY = process.env.MASTER_KEY;
  const TEACHER_PIN = process.env.TEACHER_PIN;

  if (!BIN_ID || !MASTER_KEY) {
    return res.status(500).json({ error: 'Missing BIN_ID or MASTER_KEY' });
  }

  if (!TEACHER_PIN) {
    return res.status(500).json({ error: 'TEACHER_PIN not set' });
  }

  const op = req.query.method;

  // ✅ AUTH
  if (op === 'AUTH') {
    let body = {};

    try {
      body = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body || {});
    } catch (e) {
      console.log('Parse error:', e);
      return res.status(400).json({ error: 'Bad JSON' });
    }

    const pin = body?.pin;

    console.log('RECEIVED PIN:', pin);
    console.log('EXPECTED PIN:', TEACHER_PIN);

    if (
      pin &&
      TEACHER_PIN &&
      pin.toString().trim() === TEACHER_PIN.toString().trim()
    ) {
      return res.status(200).json({ ok: true });
    }

    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
  }

  // ✅ GET
  if (op === 'GET') {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER_KEY },
      });

      const data = await r.json();

      if (!r.ok) {
        return res.status(r.status).json({ error: 'Read failed', detail: data });
      }

      return res.status(200).json(data.record || {});
    } catch (e) {
      console.log('GET error:', e);
      return res.status(500).json({ error: 'GET failed' });
    }
  }

  // ✅ PUT
  if (op === 'PUT') {
    let body = {};

    try {
      body = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body || {});
    } catch (e) {
      console.log('Parse error:', e);
      return res.status(400).json({ error: 'Bad JSON' });
