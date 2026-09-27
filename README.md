# Suki Spot

Spotify-style music UI with Spotify search, LRCLIB synced lyrics, and audio supplied by the requested downloader API.

## Downloader
The old SpotSaver flow has been removed. Audio now comes entirely from:

`https://api.ikyyxd.my.id/download/spotifydl?url=<spotify_url>`

The API response field `result.download` is preserved as `download_url` / `link_download_aktif` and used as the audio source. The Vercel `/api/stream` endpoint proxies that signed URL and forwards HTTP Range requests for HTML5 audio seeking.

## Lyrics synchronization
LRCLIB provides timestamped lines. The browser compares `audio.currentTime` with each line's `startMs`, highlights the active line, and scrolls it into view. Clicking a lyric seeks the audio to that timestamp.

Browser autoplay policies mean the user may need to press Play; once audio is playing, lyrics follow the same audio clock.

## Deploy
Import this folder into Vercel and deploy. The app uses native Node.js `fetch`; no extra downloader package is required.

Use the audio only for content you are permitted to access/use.
