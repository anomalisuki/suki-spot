# Suki Lyrics — Vercel Hobby (fixed audio)

Versi ini memperbaiki masalah audio yang tidak mau dimainkan ketika URL MP3
SpotSaver tidak bisa diputar langsung oleh browser karena perbedaan CORS,
Range request, atau header media.

## Alur

Spotify Pathfinder → pilih track → SpotSaver → MP3 URL → `/api/stream` →
HTML5 Audio → LRCLIB synced lyrics.

`/api/stream` meneruskan request `Range` dari browser ke sumber audio sehingga
seek/progress audio dapat bekerja seperti media biasa.

## Endpoint

```text
GET /api/search?q=...
GET /api/lyrics?track=...&artist=...
GET /api/audio?url=https://open.spotify.com/track/...
GET /api/track?url=https://open.spotify.com/track/...
GET /api/stream?src=<SpotSaver audio URL>
```

## Deploy

Import repository ke Vercel. Framework `Other`; tidak membutuhkan build command.

Project menggunakan Node.js serverless functions. Vercel mendukung streaming
response pada Node.js Functions. Range header juga diteruskan untuk kebutuhan
media seeking.

## Catatan

Proxy `/api/stream` hanya menerima HTTPS dari host media yang diizinkan
(SpotSaver/Google Video/Googleusercontent/dlsrv.online). SpotSaver versi saat ini
dapat mengembalikan `downloadUrl`, `mediaUrl`, atau `url`; ketiganya sudah
dinormalisasi oleh `lib/spotsaver.js`. Ini juga mengatasi respons seperti:

```json
{
  "success": 1,
  "status": "tunnel",
  "downloadUrl": "https://yt1s-worker-5.dlsrv.online/tunnel?...",
  "mediaUrl": "https://yt1s-worker-5.dlsrv.online/tunnel?...",
  "url": "https://yt1s-worker-5.dlsrv.online/tunnel?..."
}
```

Audio tetap bersumber dari URL yang diberikan SpotSaver; project ini tidak
menyimpan file MP3.
