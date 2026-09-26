const { findLyrics } = require("../lib/lrclib");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ status: false, message: "Method not allowed" });
  }

  const track = String(req.query.track || "").trim();
  const artist = String(req.query.artist || "").trim();

  if (!track) {
    return res.status(400).json({ status: false, message: "track wajib diisi." });
  }

  try {
    const data = await findLyrics(track, artist || null);
    return res.status(data.status ? 200 : 404).json(data);
  } catch (e) {
    return res.status(502).json({ status: false, message: e.message });
  }
};
