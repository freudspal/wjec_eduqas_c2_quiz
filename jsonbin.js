
export default async function handler(req, res) {
  const BIN_ID = process.env.BIN_ID;
  const MASTER_KEY = process.env.MASTER_KEY;

  const method = req.query.method;

  try {
    if (method === "GET") {
      const response = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,
        {
          headers: { "X-Master-Key": MASTER_KEY }
        }
      );

      const data = await response.json();
      return res.status(200).json(data.record);
    }

    if (method === "PUT") {
      const response = await fetch(
        `https://api.jsonbin.io/v3/b/${BIN_ID}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Master-Key": MASTER_KEY
          },
          body: JSON.stringify(req.body)
        }
      );

      const data = await response.json();
      return res.status(200).json(data);
    }

    res.status(400).json({ error: "Invalid method" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
}
