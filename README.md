# Suki Lyrics — Vercel Hobby

Web music player yang menggabungkan:

- Spotify Pathfinder untuk pencarian track
- LRCLIB untuk plain/synced lyrics
- SpotSaver untuk mendapatkan URL MP3
- HTML5 Audio + auto-scroll synced lyrics

## Deploy ke Vercel

1. Upload project ini ke GitHub.
2. Import repository ke Vercel.
3. Framework Preset: Other.
4. Build Command: kosongkan.
5. Output Directory: kosongkan.
6. Deploy.

Tidak perlu menjalankan `npm run build`.

## Endpoint

```text
GET /api/search?q=nama%20lagu
GET /api/lyrics?track=judul&artist=artis
GET /api/audio?url=https://open.spotify.com/track/...
GET /api/track?url=https://open.spotify.com/track/...
```

`/api/track` menggabungkan audio SpotSaver dan lyrics LRCLIB.

## Environment Variable (opsional)

```text
SPOTIFY_TOTP_SECRET
```

Jika tidak diisi, project menggunakan nilai yang ada pada script sumber.

## Catatan

URL audio yang dikembalikan SpotSaver diputar langsung oleh browser. Vercel tidak mem-proxy file MP3 sehingga Function tidak dipakai untuk streaming file audio.
