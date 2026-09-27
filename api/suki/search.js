const { Spotify } = require("../lib/spotify");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ status: false, message: "Method not allowed" });
  }

  const q = String(req.query.q || "").trim();
  let limit = Number(req.query.limit || 10);

  if (!q) return res.status(400).json({ status: false, message: "Query wajib diisi." });
  if (!Number.isFinite(limit) || limit < 1) limit = 10;
  limit = Math.min(Math.floor(limit), 10);

  try {
    const spotify = new Spotify();
    const data = await spotify.search(q, limit);

    return res.status(200).json({
      creator: "xDonzCode",
      action: "search",
      status: "success",
      input: { query: q, limit },
      data,
      time_ms: null
    });
  } catch (e) {
    return res.status(502).json({
      creator: "xDonzCode",
      action: "search",
      status: "failed",
      input: { query: q, limit },
      error: e.message
    });
  }
};
