const { Spotify } = require('../../lib/spotify');
function img(a){return a?.images?.length?a.images[a.images.length-1].url:null}
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({status:false});
  const id=String(req.query.id||'').trim();
  if(!id)return res.status(400).json({status:false,message:'id wajib diisi'});
  try{
    const d=await new Spotify().search(id,10);
    const a=(d.artists||[])[0];
    if(!a)return res.status(404).json({status:false,message:'Artist tidak ditemukan'});
    return res.status(200).json({status:true,result:{id:a.id,name:a.name,thumbnails:a.images||[],topSongs:(d.tracks||[]).map(t=>({videoId:t.id,title:t.name,artist:t.artists?.[0]?.name||a.name,thumbnails:t.album?.images||[],url:t.url})),topAlbums:(d.albums||[]).map(x=>({id:x.id,title:x.name,thumbnails:x.images||[],artist:(x.artists||[])[0]?.name||a.name}))}});
  }catch(e){return res.status(502).json({status:false,message:e.message})}
};
