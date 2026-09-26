const axios = require("axios");

const http = axios.create({
  baseURL: "https://lrclib.net",
  timeout: 20000,
  headers: {
    "User-Agent": "SpotifyLyricsVercel/1.0",
    Accept: "application/json"
  },
  validateStatus: () => true
});

function isBadLyrics(text) {
  if (!text) return true;
  const t = String(text).trim().toLowerCase();
  return !t || t === "probe" || t === "instrumental" || t === "..." || t.length < 40;
}

function parseSynced(lrc) {
  if (!lrc) return [];
  const lines = [];

  for (const row of String(lrc).split(/\r?\n/)) {
    const m = row.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
    if (!m) continue;

    const min = Number(m[1]);
    const sec = Number(m[2]);
    const ms = m[3]
      ? Number(String(m[3]).padEnd(3, "0").slice(0, 3))
      : 0;
    const words = m[4] || "";

    if (!words.trim()) continue;
    lines.push({ startMs: min * 60000 + sec * 1000 + ms, words });
  }

  return lines;
}

function scoreHit(x, wantArtist, wantTrack) {
  const plain = x.plainLyrics || "";
  const synced = x.syncedLyrics || "";
  const body = synced || plain;
  if (isBadLyrics(body)) return -1;

  let sc = body.length;
  if (synced && !isBadLyrics(synced)) sc += 2000;

  const a = String(x.artistName || "").toLowerCase();
  const t = String(x.trackName || x.name || "").toLowerCase();
  const wa = String(wantArtist || "").toLowerCase();
  const wt = String(wantTrack || "").toLowerCase();

  if (wa && a === wa) sc += 800;
  else if (wa && a.includes(wa)) sc += 400;
  else if (wa && wa.includes(a) && a.length > 2) sc += 200;

  if (wt && t === wt) sc += 600;
  else if (wt && t.includes(wt)) sc += 300;

  if (x.instrumental) sc -= 500;
  return sc;
}

function formatHit(x) {
  const synced = !isBadLyrics(x.syncedLyrics) ? x.syncedLyrics : null;
  const plain = !isBadLyrics(x.plainLyrics)
    ? x.plainLyrics
    : synced
      ? synced.replace(/^\[.*?\]\s*/gm, "")
      : null;

  return {
    status: true,
    id: x.id,
    trackName: x.trackName || x.name,
    artistName: x.artistName,
    albumName: x.albumName || null,
    duration: x.duration || null,
    instrumental: !!x.instrumental,
    plainLyrics: plain,
    syncedLyrics: synced,
    lines: parseSynced(synced),
    source: "lrclib.net"
  };
}

async function searchRaw(q) {
  const res = await http.get("/api/search", { params: { q } });
  if (res.status >= 400) throw new Error(`LRCLIB search HTTP ${res.status}`);
  return Array.isArray(res.data) ? res.data : [];
}

async function findLyrics(trackName, artistName) {
  const queries = [];
  if (trackName && artistName) {
    queries.push(`${trackName} ${artistName}`);
    queries.push(`${artistName} ${trackName}`);
  }
  if (trackName) queries.push(trackName);

  let best = null;
  let bestScore = -1;

  for (const q of queries) {
    const hits = await searchRaw(q);
    for (const h of hits) {
      const sc = scoreHit(h, artistName, trackName);
      if (sc > bestScore) {
        bestScore = sc;
        best = h;
      }
    }
    if (bestScore >= 2000) break;
  }

  if (!best || bestScore < 0) {
    return { status: false, message: "Lirik tidak ditemukan." };
  }

  return formatHit(best);
}

module.exports = { findLyrics, parseSynced };
