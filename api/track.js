const { findLyrics } = require("../lib/lrclib");
const { getAudio } = require("../lib/downloader");

function proxyUrl(req, source) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}/api/stream?src=${encodeURIComponent(source)}`;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ status: false, message: "Method not allowed" });
  const url = String(req.query.url || "").trim();
  if (!/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/i.test(url)) {
    return res.status(400).json({ status: false, message: "URL Spotify track tidak valid." });
  }

  try {
    const audio = await getAudio(url);
    const lyrics = await findLyrics(audio.title, audio.artist);
    return res.status(200).json({
      status: true,
      track: {
        title: audio.title,
        artist: audio.artist,
        album: audio.album,
        duration: audio.duration,
        thumbnail: audio.thumbnail,
        spotify_url: url
      },
      audio: {
        ...audio,
        direct_url: audio.download_url,
        stream_url: proxyUrl(req, audio.download_url)
      },
      lyrics
    });
  } catch (e) {
    return res.status(502).json({ status: false, message: e.message });
  }
};
