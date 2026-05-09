export default async function handler(req, res) {
  const MASTER_KEY = process.env.MASTER_KEY;
  const BIN_ID = process.env.BIN_ID;
  const QUESTIONS_BIN_ID = process.env.QUESTIONS_BIN_ID;

  
let body = {};

try {
  body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
} catch (e) {
  body = {};
}

const method = body.method || req.query.method;

console.log("RAW BODY:", req.body);
console.log("PARSED BODY:", body);
console.log("METHOD:", method);


  try {

    // =========================
    // GUARD
    // =========================
    if (!method) {
      return res.status(400).json({ error: "No method provided" });
    }

    // =========================
    // GET QUESTIONS
    // =========================
    if (method === "GET_QUESTIONS") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}/latest`,
        {
          headers: { "X-Master-Key": MASTER_KEY }
        }
      );

      const text = await r.text();
      console.log("JSONBIN RAW:", text);

      const j = JSON.parse(text);

      return res.status(200).json(j.record || {});
    }

    // =========================
    // PUT QUESTIONS
    // =========================
    if (method === "PUT_QUESTIONS") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${QUESTIONS_BIN_ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": MASTER_KEY
          },
          body: JSON.stringify()
        }
      );

      return res.status(200).json(await r.json());
    }

    // =========================
    // GET STUDENT DB
    // =========================
    if (method === "GET") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
        {
          headers: { "X-Master-Key": MASTER_KEY }
        }
      );

      const text = await r.text();
      console.log("DB RAW:", text);

      const j = JSON.parse(text);

      return res.status(200).json(j.record || {});
    }

    // =========================
    // PUT STUDENT DB
    // =========================
    if (method === "PUT") {
      const r = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": MASTER_KEY
          },
          
body: JSON.stringify({
  method: method,
  ...body
})

        }
      );

      return res.status(200).json(await r.json());
    }

    // =========================
    // FALLBACK
    // =========================
    return res.status(400).json({
      error: "Invalid method",
      received: method
    });

  } catch (err) {
    console.error("CRASH:", err);
    return res.status(500).json({
      error: "Server crashed",
      message: err.message
    });
  }
}
