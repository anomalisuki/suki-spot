const $ = (id) => document.getElementById(id);

const queryEl = $("query");
const searchBtn = $("searchBtn");
const resultsEl = $("results");
const statusEl = $("status");
const playerEl = $("player");
const audio = $("audio");
const lyricsEl = $("lyrics");
const seek = $("seek");

let currentLines = [];
let activeIndex = -1;
let currentData = null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function fmt(ms) {
  const sec = Math.max(0, Math.floor((ms || 0) / 1000));
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`;
}

function setStatus(s) {
  statusEl.textContent = s || "";
}

function coverOf(track) {
  return track?.album?.images?.[0]?.url ||
         track?.images?.[0]?.url ||
         "";
}

async function search() {
  const q = queryEl.value.trim();
  if (!q) return;

  searchBtn.disabled = true;
  setStatus("Mencari di Spotify...");
  resultsEl.innerHTML = "";

  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`);
    const j = await r.json();
    if (!r.ok || j.status !== "success") throw new Error(j.error || j.message || "Search gagal");

    const tracks = j.data?.tracks || [];
    if (!tracks.length) {
      setStatus("Lagu tidak ditemukan.");
      return;
    }

    setStatus(`${tracks.length} hasil ditemukan.`);
    resultsEl.innerHTML = tracks.map((t, i) => {
      const artists = (t.artists || []).map(a => a.name).join(", ");
      const img = coverOf(t);
      return `
        <div class="result" data-index="${i}">
          <img src="${esc(img)}" alt="">
          <div class="result-info">
            <div class="result-title">${esc(t.name)}</div>
            <div class="result-artist">${esc(artists || "Unknown artist")}</div>
          </div>
          <div class="result-arrow">›</div>
        </div>`;
    }).join("");

    [...resultsEl.querySelectorAll(".result")].forEach(el => {
      el.addEventListener("click", () => {
        const track = tracks[Number(el.dataset.index)];
        openTrack(track);
      });
    });
  } catch (e) {
    setStatus(e.message);
  } finally {
    searchBtn.disabled = false;
  }
}

async function openTrack(track) {
  const artist = (track.artists || []).map(a => a.name).join(", ");
  const spotifyUrl = track.url;

  playerEl.classList.remove("hidden");
  $("title").textContent = track.name || "-";
  $("artist").textContent = artist || "-";
  $("album").textContent = track.album?.name || "";
  $("cover").src = coverOf(track) || "";

  lyricsEl.innerHTML = '<div class="empty">Memuat audio dan lirik...</div>';
  audio.removeAttribute("src");
  audio.load();
  currentLines = [];
  activeIndex = -1;

  setStatus(`Memproses ${track.name}...`);
  playerEl.scrollIntoView({behavior:"smooth", block:"start"});

  try {
    const r = await fetch(`/api/track?url=${encodeURIComponent(spotifyUrl)}`);
    const j = await r.json();
    if (!r.ok || !j.status) throw new Error(j.message || "Gagal memproses lagu.");

    currentData = j;
    const a = j.audio;

    if (a?.download_url) {
      audio.src = a.download_url;
      audio.load();
    }

    if (a?.thumbnail) $("cover").src = a.thumbnail;
    $("title").textContent = a?.title || track.name;
    $("artist").textContent = a?.artist || artist;
    $("album").textContent = a?.album || track.album?.name || "";

    renderLyrics(j.lyrics);
    setStatus("Siap diputar.");
  } catch (e) {
    lyricsEl.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    setStatus(e.message);
  }
}

function renderLyrics(data) {
  if (!data?.status) {
    lyricsEl.innerHTML = `<div class="empty">${esc(data?.message || "Lirik tidak tersedia.")}</div>`;
    return;
  }

  currentLines = Array.isArray(data.lines) ? data.lines : [];

  if (currentLines.length) {
    lyricsEl.innerHTML = currentLines.map((x, i) =>
      `<div class="line" data-i="${i}" data-ms="${x.startMs}">
        ${esc(x.words)}
      </div>`
    ).join("");

    [...lyricsEl.querySelectorAll(".line")].forEach(el => {
      el.addEventListener("click", () => {
        audio.currentTime = Number(el.dataset.ms) / 1000;
        audio.play().catch(()=>{});
      });
    });
  } else if (data.plainLyrics) {
    lyricsEl.innerHTML = `<div class="plain">${esc(data.plainLyrics)}</div>`;
  } else {
    lyricsEl.innerHTML = '<div class="empty">Lirik tidak tersedia.</div>';
  }
}

function updateLyrics() {
  if (!currentLines.length) return;
  const now = audio.currentTime * 1000;

  let lo = 0, hi = currentLines.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (currentLines[mid].startMs <= now) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (idx === activeIndex) return;
  activeIndex = idx;

  const nodes = lyricsEl.querySelectorAll(".line");
  nodes.forEach(n => n.classList.remove("active"));

  if (idx >= 0 && nodes[idx]) {
    nodes[idx].classList.add("active");
    nodes[idx].scrollIntoView({behavior:"smooth", block:"center"});
  }
}

audio.addEventListener("timeupdate", () => {
  updateLyrics();
  if (audio.duration) {
    seek.value = (audio.currentTime / audio.duration) * 100;
    $("current").textContent = fmt(audio.currentTime * 1000);
    $("total").textContent = fmt(audio.duration * 1000);
  }
});

seek.addEventListener("input", () => {
  if (audio.duration) audio.currentTime = (Number(seek.value) / 100) * audio.duration;
});

searchBtn.addEventListener("click", search);
queryEl.addEventListener("keydown", e => {
  if (e.key === "Enter") search();
});
