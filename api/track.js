const { findLyrics } = require("../lib/lrclib");
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
  const title = String(req.query.track || "").trim();
  const artist = String(req.query.artist || "").trim();

  if (!url && !title) {
    return res.status(400).json({
      status: false,
      message: "url Spotify atau track wajib diisi."
    });
  }

  try {
    let audio = null;
    let trackName = title;
    let artistName = artist;

    if (url) {
      audio = await getAudio(url);
      trackName = audio.title;
      artistName = audio.artist;
      audio = {
        ...audio,
        direct_url: audio.download_url,
        stream_url: proxyUrl(req, audio.download_url)
      };
    }

    const lyrics = await findLyrics(trackName, artistName);

    return res.status(200).json({
      status: true,
      track: {
        title: trackName,
        artist: artistName,
        spotify_url: url || null
      },
      audio,
      lyrics
    });
  } catch (e) {
    return res.status(502).json({
      status: false,
      message: e.message
    });
  }
};
