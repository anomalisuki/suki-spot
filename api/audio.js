const { getAudio } = require("../lib/spotsaver");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ status: false, message: "Method not allowed" });
  }

  const url = String(req.query.url || "").trim();

  if (!url || !/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/i.test(url)) {
    return res.status(400).json({
      status: false,
      message: "URL Spotify track tidak valid."
    });
  }

  try {
    const data = await getAudio(url);
    return res.status(200).json({
      creator: "xDonzCode",
      status: "success",
      data
    });
  } catch (e) {
    return res.status(502).json({
      creator: "xDonzCode",
      status: "failed",
      error: e.message
    });
  }
};
