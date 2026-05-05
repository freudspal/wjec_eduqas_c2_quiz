export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const BIN_ID      = process.env.BIN_ID;
  const MASTER_KEY  = process.env.MASTER_KEY;
  const TEACHER_PIN = process.env.TEACHER_PIN || '1234';

  if (!BIN_ID || !MASTER_KEY) {
    return res.status(500).json({ error: 'Server env vars not configured (BIN_ID and MASTER_KEY required)' });
  }

  const op = req.query.method;

  // AUTH — verify teacher PIN server-side, never exposed to browser
  if (op === 'AUTH') {
    const { pin } = req.body || {};
    if (String(pin) === String(TEACHER_PIN)) {
      return res.status(200).json({ ok: true });
    }
    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
  }

  // GET — read full record from JSONBin
  if (op === 'GET') {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER_KEY },
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: 'JSONBin read failed', detail: data });
      return res.status(200).json(data.record || {});
    } catch (e) {
      return res.status(500).json({ error: 'Network error reading JSONBin' });
    }
  }

  // PUT — write full record to JSONBin
  if (op === 'PUT') {
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': MASTER_KEY,
        },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: 'JSONBin write failed', detail: data });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Network error writing to JSONBin' });
    }
  }

  return res.status(400).json({ error: 'Unknown op. Use ?method=GET|PUT|AUTH' });
}
