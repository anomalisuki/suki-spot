(() => {
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const fmt=v=>{v=Math.max(0,Math.floor(Number(v)||0));return `${Math.floor(v/60)}:${String(v%60).padStart(2,"0")}`};
const cover=t=>t?.album?.images?.[0]?.url||t?.images?.[0]?.url||"";
const artists=t=>(t?.artists||[]).map(a=>a.name).filter(Boolean).join(", ")||"Unknown";
let tracks=[], queue=[], index=-1, lyrics=[], lyricIndex=-1;
const audio=$("audio");

function load(key, fallback=[]){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}}
function save(key,val){localStorage.setItem(key,JSON.stringify(val))}
let liked=load("suki_liked",[]), playlists=load("suki_playlists",[]);
function normalize(t){return {id:t.id||t.uri||crypto.randomUUID(),url:t.url||t.uri?.includes("spotify:track:")?`https://open.spotify.com/track/${t.uri.split(":").pop()}`:t.url,name:t.name||"Unknown",artist:artists(t),cover:cover(t),album:t.album?.name||"",duration:t.duration_ms||0,spotify:t}}
function isLiked(t){return liked.some(x=>x.id===t.id)}
function toggleLike(t){if(isLiked(t)) liked=liked.filter(x=>x.id!==t.id);else liked.unshift(t);save("suki_liked",liked);renderAll();updatePlayer()}
function card(t,i){return `<button data-i="${i}" class="track-card card rounded-2xl p-2.5 text-left w-full"><div class="relative aspect-square rounded-xl overflow-hidden"><img src="${esc(t.cover)}" class="w-full h-full object-cover" onerror="this.style.opacity=.2"><span class="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-xl"><i data-lucide="play" class="w-4 h-4 fill-current ml-0.5"></i></span></div><div class="font-bold text-sm mt-2 truncate">${esc(t.name)}</div><div class="text-[11px] text-white/50 mt-1 truncate">${esc(t.artist)}</div></button>`}
function row(t,i){let cur=queue[index]?.id===t.id;return `<div class="song-row ${cur?"current":""} rounded-2xl p-2.5 flex items-center gap-3"><button class="rowplay w-10 h-10 rounded-xl overflow-hidden shrink-0" data-i="${i}"><img src="${esc(t.cover)}" class="w-full h-full object-cover"></button><button class="rowinfo min-w-0 flex-1 text-left" data-i="${i}"><div class="font-semibold text-sm truncate">${esc(t.name)}</div><div class="text-[11px] text-white/50 truncate mt-1">${esc(t.artist)}</div></button><button class="rowlike p-2 ${isLiked(t)?"text-rose-400":"text-white/45"}" data-id="${esc(t.id)}"><i data-lucide="heart" class="w-4 h-4 ${isLiked(t)?"fill-current":""}"></i></button></div>`}
function bindRows(root){root.querySelectorAll(".track-card").forEach(b=>b.onclick=()=>playQueue(tracks,+b.dataset.i));root.querySelectorAll(".rowplay,.rowinfo").forEach(b=>b.onclick=()=>playQueue(queue.length?queue:+b.dataset.i,+b.dataset.i));root.querySelectorAll(".rowlike").forEach(b=>b.onclick=()=>{let t=[...tracks,...liked,...queue].find(x=>x.id===b.dataset.id);if(t)toggleLike(t)});lucide.createIcons()}
function header(title,sub=""){return `<div class="px-4 pt-8 pb-5 sticky top-0 z-20 bg-gradient-to-b from-[#08090d]/95 to-[#08090d]/70 backdrop-blur-xl"><h1 class="text-3xl font-black tracking-tight">${title}</h1>${sub?`<p class="text-xs text-white/45 mt-1">${sub}</p>`:""}</div>`}

function home(){
 $("homeView").innerHTML=header("Suki Music","Spotify search + audio + lirik");
 $("homeView").innerHTML+=`<div class="px-4 mt-3"><div class="glass rounded-3xl p-5 overflow-hidden relative"><div class="relative z-10"><span class="text-[10px] uppercase tracking-[.25em] text-white/45 font-bold">Music player</span><h2 class="text-2xl font-black mt-2">Cari lagu favoritmu.</h2><p class="text-sm text-white/55 mt-2 max-w-sm">Search katalog Spotify, putar audio, simpan favorit, dan baca lirik tersinkron.</p><button class="btn mt-5" onclick="go('search')"><i data-lucide="search" class="w-4 h-4 inline mr-1"></i> Mulai mencari</button></div><img src="/banner.png" class="absolute right-[-25px] bottom-[-35px] w-48 h-48 object-cover rounded-full opacity-25 blur-[1px]"></div></div>`;
 if(liked.length){$("homeView").innerHTML+=`<div class="px-4 mt-7"><div class="flex items-end justify-between mb-3"><h3 class="font-black text-lg">Terakhir disukai</h3><button onclick="go('liked')" class="text-xs text-white/50">Lihat semua</button></div><div class="grid grid-cols-2 gap-3">${liked.slice(0,4).map((t,i)=>card(t,i)).join("")}</div></div>`}
 if(playlists.length){$("homeView").innerHTML+=`<div class="px-4 mt-7"><h3 class="font-black text-lg mb-3">Playlist</h3><div class="grid grid-cols-2 gap-3">${playlists.map((p,i)=>`<button onclick="openPlaylist(${i})" class="card rounded-2xl p-3 text-left"><img src="${esc(p.cover||"/logo.png")}" class="w-full aspect-square object-cover rounded-xl"><b class="block truncate mt-2">${esc(p.name)}</b><span class="text-[11px] text-white/45">${p.songs.length} lagu</span></button>`).join("")}</div></div>`}
 lucide.createIcons();bindRows($("homeView"));
}
async function search(q){
 if(!q)return; $("searchStatus").textContent="Mencari...";
 try{let r=await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`),j=await r.json();if(!r.ok||j.status!=="success")throw Error(j.error||j.message||"Search gagal");tracks=(j.data?.tracks||[]).map(normalize);$("searchStatus").textContent=tracks.length?`${tracks.length} hasil untuk “${q}”`:"Tidak ada hasil";$("searchResults").innerHTML=tracks.map((t,i)=>row(t,i)).join("");queue=tracks;bindRows($("searchResults"))}
 catch(e){$("searchStatus").textContent=e.message;$("searchResults").innerHTML=""}
}
function searchView(){ $("searchView").innerHTML=header("Cari","Temukan lagu dari katalog Spotify")+`<div class="px-4 mt-2"><div class="glass rounded-2xl flex items-center gap-2 px-4 py-2.5"><i data-lucide="search" class="w-5 h-5 text-white/45"></i><input id="searchInput" class="bg-transparent outline-none flex-1 py-2 text-sm" placeholder="Judul lagu atau artis..." autocomplete="off"><button id="doSearch" class="btn !py-2 !px-4 text-xs">Cari</button></div><div id="searchStatus" class="text-xs text-white/45 mt-4"></div><div id="searchResults" class="space-y-2 mt-3 pb-8"></div></div>`;lucide.createIcons();$("doSearch").onclick=()=>search($("searchInput").value.trim());$("searchInput").onkeydown=e=>{if(e.key==="Enter")search($("searchInput").value.trim())};$("searchInput").focus()}

function library(){
 let html=header("Library",`${playlists.length} playlist • ${liked.length} lagu disukai`);
 html+=`<div class="px-4 mt-2"><div class="flex gap-2"><button class="btn !bg-white/10 !text-white flex-1" onclick="createPlaylist()"><i data-lucide="plus" class="w-4 h-4 inline"></i> Playlist baru</button><button class="btn !bg-white/10 !text-white flex-1" onclick="go('liked')"><i data-lucide="heart" class="w-4 h-4 inline"></i> Lagu disukai</button></div>`;
 if(!playlists.length) html+=`<div class="text-center py-20 text-white/40"><i data-lucide="library" class="w-12 h-12 mx-auto mb-3 opacity-40"></i><p>Belum ada playlist.</p></div>`;
 else html+=`<div class="grid grid-cols-2 gap-3 mt-5">${playlists.map((p,i)=>`<button onclick="openPlaylist(${i})" class="card rounded-2xl p-2.5 text-left"><img src="${esc(p.cover||"/logo.png")}" class="w-full aspect-square object-cover rounded-xl"><b class="block truncate mt-2">${esc(p.name)}</b><span class="text-[11px] text-white/45">${p.songs.length} lagu</span></button>`).join("")}</div>`;
 html+=`</div>`;$("libraryView").innerHTML=html;lucide.createIcons();
}
function createPlaylist(){let name=prompt("Nama playlist:");if(!name?.trim())return;playlists.unshift({id:Date.now().toString(),name:name.trim(),cover:"",songs:[]});save("suki_playlists",playlists);library()}
function openPlaylist(i){let p=playlists[i];if(!p)return;queue=p.songs||[];index=-1;let html=header(p.name,`${queue.length} lagu`)+`<div class="px-4 mt-2"><div class="flex gap-2 mb-4"><button class="btn" onclick="playQueue(queue,0)">▶ Putar semua</button><button class="btn !bg-white/10 !text-white" onclick="if(confirm('Hapus playlist ini?')){playlists.splice(${i},1);save('suki_playlists',playlists);library()}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div><div class="space-y-2">${queue.map((t,j)=>row(t,j)).join("")}</div></div>`;$("libraryView").innerHTML=html;showOnly("library");lucide.createIcons();bindRows($("libraryView"))}
function likedView(){let html=header("Lagu Disukai",`${liked.length} lagu tersimpan`)+`<div class="px-4 mt-2">`;if(liked.length)html+=`<button class="btn mb-4" onclick="playQueue(liked,0)">▶ Putar semua</button><div class="space-y-2">${liked.map((t,i)=>row(t,i)).join("")}</div>`;else html+=`<div class="text-center py-20 text-white/40"><i data-lucide="heart" class="w-12 h-12 mx-auto mb-3 opacity-40"></i><p>Belum ada lagu yang disukai.</p></div>`;html+="</div>";$("likedView").innerHTML=html;lucide.createIcons();bindRows($("likedView"))}
function profile(){ $("profileView").innerHTML=header("Profil","Informasi aplikasi")+`<div class="px-4 mt-2 text-center"><div class="glass rounded-3xl p-7"><img src="/logo.png" class="w-24 h-24 rounded-full mx-auto border border-white/15 shadow-2xl"><h2 class="text-2xl font-black mt-4">Suki Music</h2><p class="text-sm text-white/50 mt-1">Spotify Music Web Player</p><div class="text-left mt-7 space-y-3"><div class="glass rounded-2xl p-4 flex justify-between"><span class="text-white/50 text-sm">Search</span><b>Spotify</b></div><div class="glass rounded-2xl p-4 flex justify-between"><span class="text-white/50 text-sm">Lyrics</span><b>LRCLIB</b></div><div class="glass rounded-2xl p-4 flex justify-between"><span class="text-white/50 text-sm">Audio</span><b>Downloader API</b></div></div></div></div>`;lucide.createIcons()}

function showOnly(v){["home","search","library","liked","profile"].forEach(x=>$(`${x}View`).classList.toggle("hidden",x!==v));document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===v));$("main").scrollTop=0}
function go(v){if(v==="home")home();if(v==="search")searchView();if(v==="library")library();if(v==="liked")likedView();if(v==="profile")profile();showOnly(v)}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>go(b.dataset.view));

async function playQueue(q,i){if(!q?.[i])return;queue=q;index=i;let t=queue[index];openFull(t);audio.pause();audio.removeAttribute("src");audio.load();setFullLoading(true);try{let r=await fetch(`/api/track?url=${encodeURIComponent(t.url)}`),j=await r.json();if(!r.ok||!j.status)throw Error(j.message||"Gagal memproses lagu");let a=j.audio;t={...t,name:a.title||t.name,artist:a.artist||t.artist,cover:a.thumbnail||t.cover,stream:a.stream_url||a.download_url};queue[index]=t;updatePlayer();renderLyrics(j.lyrics);audio.src=t.stream;audio.load();await audio.play().catch(()=>{});setFullLoading(false)}catch(e){setFullLoading(false);$("fullLyrics").innerHTML=`<div class="text-center text-red-300 py-20">${esc(e.message)}</div>`}}
function openFull(t){$("fullPlayer").classList.remove("hidden");$("fullCover").src=t.cover||"/logo.png";$("fullBg").src=t.cover||"/logo.png";$("fullTitle").textContent=t.name;$("fullArtist").textContent=t.artist;$("fullHeaderArtist").textContent=t.artist;setFullLoading(false);lucide.createIcons()}
function setFullLoading(v){if(v)$("fullTitle").textContent="Memuat..."}
function closeFull(){ $("fullPlayer").classList.add("hidden") }
function updatePlayer(){let t=queue[index];if(!t){$("mini").classList.add("hidden");return}$("mini").classList.remove("hidden");$("miniCover").src=t.cover||"/logo.png";$("miniTitle").textContent=t.name;$("miniArtist").textContent=t.artist;$("fullCover").src=t.cover||"/logo.png";$("fullBg").src=t.cover||"/logo.png";$("fullTitle").textContent=t.name;$("fullArtist").textContent=t.artist;$("fullHeaderArtist").textContent=t.artist;lucide.createIcons()}
function renderLyrics(d){lyrics=Array.isArray(d?.lines)?d.lines:[];lyricIndex=-1;if(lyrics.length)$("fullLyrics").innerHTML=lyrics.map((x,i)=>`<div class="lyric-line" data-i="${i}" data-ms="${x.startMs}">${esc(x.words)}</div>`).join("");else $("fullLyrics").innerHTML=d?.plainLyrics?`<div class="whitespace-pre-wrap text-white/75 leading-8">${esc(d.plainLyrics)}</div>`:`<div class="text-center text-white/35 py-20">Lirik tidak tersedia.</div>`;$("fullLyrics").querySelectorAll(".lyric-line").forEach(n=>n.onclick=()=>{audio.currentTime=+n.dataset.ms/1000;audio.play().catch(()=>{})})}
function updateLyrics(){if(!lyrics.length)return;let now=audio.currentTime*1000,lo=0,hi=lyrics.length-1,idx=-1;while(lo<=hi){let m=(lo+hi)>>1;if(lyrics[m].startMs<=now){idx=m;lo=m+1}else hi=m-1}if(idx===lyricIndex)return;lyricIndex=idx;$("fullLyrics").querySelectorAll(".lyric-line").forEach(n=>n.classList.toggle("active",+n.dataset.i===idx));let n=$(`fullLyrics`).querySelector(`[data-i="${idx}"]`);if(n)n.scrollIntoView({behavior:"smooth",block:"center"})}

$("closeFull").onclick=closeFull;
$("fullPlayer").addEventListener("click",e=>{if(e.target.id==="fullPlayer")closeFull()});
$("mini").onclick=e=>{if(e.target.closest("#miniLike")||e.target.closest("#miniPlay"))return;openFull(queue[index])};
$("miniPlay").onclick=e=>{e.stopPropagation();if(audio.paused)audio.play().catch(()=>{});else audio.pause()};
$("miniLike").onclick=e=>{e.stopPropagation();if(queue[index])toggleLike(queue[index])};
$("fullLike").onclick=()=>{if(queue[index])toggleLike(queue[index])};
$("fullPlay").onclick=()=>{if(audio.paused)audio.play().catch(()=>{});else audio.pause()};
$("prevBtn").onclick=()=>{if(index>0)playQueue(queue,index-1)};
$("nextBtn").onclick=()=>{if(index<queue.length-1)playQueue(queue,index+1)};
$("fullSeek").oninput=e=>{if(audio.duration)audio.currentTime=audio.duration*(+e.target.value/100)};
$("tabCover").onclick=()=>{ $("coverWrap").classList.remove("hidden");$("lyricsWrap").classList.add("hidden");$("tabCover").className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold";$("tabLyrics").className="px-4 py-1.5 rounded-full text-white/60 text-xs font-bold"};
$("tabLyrics").onclick=()=>{ $("coverWrap").classList.add("hidden");$("lyricsWrap").classList.remove("hidden");$("tabLyrics").className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold";$("tabCover").className="px-4 py-1.5 rounded-full text-white/60 text-xs font-bold"};
audio.addEventListener("play",()=>{$("fullPlay").innerHTML='<i data-lucide="pause" class="fill-current"></i>';$("miniPlay").innerHTML='<i data-lucide="pause" class="w-4 h-4"></i>';lucide.createIcons()});
audio.addEventListener("pause",()=>{$("fullPlay").innerHTML='<i data-lucide="play" class="fill-current"></i>';$("miniPlay").innerHTML='<i data-lucide="play" class="w-4 h-4"></i>';lucide.createIcons()});
audio.addEventListener("timeupdate",()=>{updateLyrics();if(audio.duration){$("fullSeek").value=audio.currentTime/audio.duration*100;$("fullCurrent").textContent=fmt(audio.currentTime);$("fullTotal").textContent=fmt(audio.duration)}});
audio.addEventListener("ended",()=>{if(index<queue.length-1)playQueue(queue,index+1)});
window.addEventListener("popstate",()=>closeFull());
window.createPlaylist=createPlaylist;window.openPlaylist=openPlaylist;window.playQueue=playQueue;window.go=go;

home();profile();library();likedView();go("home");lucide.createIcons();
setTimeout(()=>{$("splash").style.opacity="0";setTimeout(()=>$("splash").remove(),350)},700);
if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
})();
