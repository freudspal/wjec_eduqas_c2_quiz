module.exports = async (req, res) => {
  try {
    const BIN_ID = process.env.BIN_ID;
    const MASTER_KEY = process.env.MASTER_KEY;
    const TEACHER_PIN = process.env.TEACHER_PIN;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const op = url.searchParams.get('method');

    // ✅ AUTH
    if (op === 'AUTH') {
      let body = {};

      try {
        body = typeof req.body === 'string'
          ? JSON.parse(req.body)
          : (req.body || {});
      } catch {}

      const pin = body?.pin;

      if (pin && TEACHER_PIN && pin == TEACHER_PIN) {
        return res.status(200).json({ ok: true });
      }

      return res.status(401).json({ ok: false });
    }

    // ✅ GET
    if (op === 'GET') {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: { 'X-Master-Key': MASTER_KEY },
      });

      const data = await r.json();
      return res.status(200).json(data.record || {});
    }

    // ✅ PUT
    if (op === 'PUT') {
      let body = {};

      try {
        body = typeof req.body === 'string'
          ? JSON.parse(req.body)
          : (req.body || {});
      } catch {}

      await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': MASTER_KEY,
        },
        body: JSON.stringify(body),
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid method' });

  } catch (err) {
    console.log('CRASH:', err);
    return res.status(500).json({ error: 'Server crash' });
  }
};
