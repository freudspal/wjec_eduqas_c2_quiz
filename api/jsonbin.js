module.exports = async (req, res) => {
  console.log('FUNCTION STARTED');

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

  console.log('METHOD:', req.query.metho
             
  // ✅ AUTH
  if (op === 'AUTH') {
    let body = {};

    try {
      body = typeof req.body === 'string'
        ? JSON.parse(req.body)
        : (req.body || {});
    } catch {
      return res.status(400).json({ error: 'Bad JSON' });
    }

    const pin = body?.pin;
    
    console.log('PIN RECEIVED:', pin);
    console.log('PIN EXPECTED:', TEACHER_PIN);

    if (
      pin &&
      pin.toString().trim() === TEACHER_PIN.toString().trim()
    ) {
      return res.status(200).json({ ok: true });
    }

    return res.status(401).json({ ok: false, error: 'Incorrect PIN' });
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
    } catch {
      return res.status(400).json({ error: 'Bad JSON' });
    }

    const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
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
}
