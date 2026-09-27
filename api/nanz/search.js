const { Spotify } = require('../../lib/spotify');

function imageOf(images) {
  return Array.isArray(images) && images.length ? images[images.length - 1].url : null;
}
function track(t) {
  const artist = t.artists?.[0] || {};
  return {
    id: t.id,
    videoId: t.id,
    title: t.name || '',
    artist: artist.name || 'Unknown Artist',
    artistId: artist.id || '',
    thumbnail: imageOf(t.album?.images),
    cover: imageOf(t.album?.images),
    url: t.url,
    duration: Math.round((t.duration_ms || 0) / 1000),
    album: t.album?.name || '',
    albumId: t.album?.id || ''
  };
}
function artist(a) {
  return { id: a.id, title: a.name || '', name: a.name || '', cover: imageOf(a.images), thumbnail: imageOf(a.images), url: a.url };
}
function collection(x) {
  return { id: x.id, title: x.name || '', name: x.name || '', cover: imageOf(x.images), thumbnail: imageOf(x.images), url: x.url, description: x.description || '' };
}
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({status:false,message:'Method not allowed'});
  const q = String(req.query.query || req.query.q || '').trim();
  if (!q) return res.status(400).json({status:false,message:'Query wajib diisi.'});
  try {
    const data = await new Spotify().search(q, 10);
    return res.status(200).json({
      status:true,
      result:{
        songs:(data.tracks||[]).map(track),
        artists:(data.artists||[]).map(artist),
        playlists:(data.playlists||[]).map(collection),
        albums:(data.albums||[]).map(collection),
        top_results:data.top_results||[]
      }
    });
  } catch(e) { return res.status(502).json({status:false,result:{songs:[],artists:[],playlists:[],albums:[]},message:e.message}); }
};
