const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BIN_ID = process.env.BIN_ID;
  const MASTER_KEY = process.env.MASTER_KEY;
  const TEACHER_PIN = process.env.TEACHER_PIN;

  if (!BIN_ID || !MASTER_KEY) {
    return res.status(500).json({ error: 'Missing BIN_ID or MASTER_KEY env vars' });
  }

  if (!TEACHER_PIN) {
    return res.status(500).json({ error: 'TEACHER_PIN not configured' });
  }

  const op = req.query.method;

  // ── AUTH ─────────────────────────────────────────────
  if (op === 'AUTH') {
    let body = {};

    try {
      body = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body || {});
    } catch {}

    const pin = body?.pin ?? req.query

    if (
      pin &&
      TEACHER_PIN &&
      pin.toString().trim() === TEACHER_PIN.toString().trim(
    ) {
      return res.status(200).json({ ok: true });
    }

    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
  }

  // ── GET ──────────────────────────────────────────────
  if (op === 'GET') {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER_KEY },
      });

      const data = await r.json();
      if (!r.ok) {
        return res.status(r.status).json({ error: 'JSONBin read failed', detail: data });
      }

      return res.status(200).json(data.record || {});
    } catch {
      return res.status(500).json({ error: 'Network error reading JSONBin' });
    }
  }

  // ── PUT ──────────────────────────────────────────────
  if (op === 'PUT') {
    let body = {};

    try {
      body = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body || {});
    } catch {}

    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': MASTER_KEY,
        },
        body: JSON.stringify(body),
      });

      const data = await r.json();
      if (!r.ok) {
        return res.status(r.status).json({ error: 'JSONBin write failed', detail: data });
      }

      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'Network error writing JSONBin' });
    }
  }

  return res.status(400).json({ error: 'Unknown op. Use ?method=GET, PUT, AUTH' });
}
