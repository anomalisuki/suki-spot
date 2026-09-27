const API = "https://api.ikyyxd.my.id/download/spotifydl";

async function getAudio(spotifyUrl) {
  const res = await fetch(`${API}?url=${encodeURIComponent(spotifyUrl)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36",
      "Accept": "application/json"
    }
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = null; }

  if (!res.ok || !data?.status || !data?.result?.download) {
    throw new Error(data?.message || `Downloader HTTP ${res.status}`);
  }

  const r = data.result;
  return {
    title: r.title || "Unknown",
    artist: r.artist || "Unknown",
    album: r.album || "",
    duration: r.duration || "0:00",
    thumbnail: r.thumbnail || "",
    download_url: r.download,
    link_download_aktif: r.download,
    source: "api.ikyyxd.my.id",
    raw: data
  };
}

module.exports = { getAudio };
