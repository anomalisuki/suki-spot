const BASE = "https://spotsaver.net";

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

async function fetchJSON(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 800) };
    }

    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

async function getInfo(spotifyUrl) {
  return fetchJSON(
    `${BASE}/api/spotify/?url=${encodeURIComponent(spotifyUrl)}`,
    {
      headers: {
        "User-Agent": UA,
        Referer: `${BASE}/`,
        Accept: "application/json, text/plain, */*"
      }
    }
  );
}

async function getVideoId(title, artist) {
  return fetchJSON(`${BASE}/api/get-id/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `${BASE}/`,
      Origin: BASE,
      "User-Agent": UA
    },
    body: JSON.stringify({ title, artist })
  });
}

async function download(videoId, title, format = "mp3") {
  return fetchJSON(`${BASE}/api/download/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `${BASE}/`,
      Origin: BASE,
      "User-Agent": UA
    },
    body: JSON.stringify({
      videoId,
      candidateIds: [],
      format,
      title,
      licenseKey: null
    })
  });
}

async function getAudio(spotifyUrl) {
  const info = await getInfo(spotifyUrl);
  if (!info.ok) throw new Error(`SpotSaver info HTTP ${info.status}`);

  const track = Array.isArray(info.data?.items) ? info.data.items[0] : null;
  if (!track) throw new Error("Track tidak ditemukan di SpotSaver.");

  const title = track.title || "Unknown";
  const artist = track.artist || "Unknown";

  const idRes = await getVideoId(title, artist);
  if (!idRes.ok || !idRes.data?.videoId) {
    throw new Error("SpotSaver gagal mendapatkan videoId.");
  }

  const videoId = idRes.data.videoId;
  const dl = await download(videoId, `${title} - ${artist}`);

  // SpotSaver saat ini dapat mengembalikan URL audio dengan beberapa nama
  // field: downloadUrl, mediaUrl, atau url. Normalisasi semuanya ke satu field.
  const downloadUrl =
    dl.data?.downloadUrl ||
    dl.data?.mediaUrl ||
    dl.data?.url ||
    null;

  if (!dl.ok || !downloadUrl) {
    throw new Error(
      `SpotSaver gagal mendapatkan URL MP3${dl.status ? ` (HTTP ${dl.status})` : ""}.`
    );
  }

  return {
    id: track.id || null,
    title,
    artist,
    album: track.album || null,
    thumbnail: track.thumbnail || null,
    duration: track.duration || 0,
    preview_url: track.previewUrl || null,
    video_id: videoId,
    filename: dl.data.filename || null,
    status: dl.data.status || null,
    download_url: downloadUrl,
    // Nama field asli SpotSaver juga disimpan untuk debugging/kompatibilitas.
    spot_saver: {
      success: dl.data.success ?? null,
      status: dl.data.status || null,
      downloadUrl: dl.data.downloadUrl || null,
      mediaUrl: dl.data.mediaUrl || null,
      url: dl.data.url || null
    }
  };
}

module.exports = { getInfo, getVideoId, download, getAudio };
