# Suki Music — UI v3

UI modern mengikuti gaya `music-main`, tetapi API/backend dan library utama berasal dari `suki-v3`.

## API yang dipakai
- GET /api/search?q=...
- GET /api/track?url=https://open.spotify.com/track/...
- GET /api/audio?url=...
- GET /api/lyrics?track=...&artist=...
- GET /api/stream?src=...

Tidak memakai endpoint `/api/nanz/*` dari proyek referensi.

## Deploy
1. Upload repository/ZIP ke GitHub.
2. Import project ke Vercel.
3. Install dependency `npm install`.
4. Deploy.
