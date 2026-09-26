const { getAudio } = require("../lib/spotsaver");

function proxyUrl(req, source) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}/api/stream?src=${encodeURIComponent(source)}`;
}

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
      data: {
        ...data,
        direct_url: data.download_url,
        stream_url: proxyUrl(req, data.download_url)
      }
    });
  } catch (e) {
    return res.status(502).json({
      creator: "xDonzCode",
      status: "failed",
      error: e.message
    });
  }
};
