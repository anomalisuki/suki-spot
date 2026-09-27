const { Spotify } = require('../../lib/spotify');
module.exports=async(req,res)=>{
  if(req.method!=='GET')return res.status(405).json({status:false});
  const id=String(req.query.id||'').trim();
  if(!id)return res.status(400).json({status:false,message:'id wajib diisi'});
  try{
    // The Suki v3 Spotify parser exposes album metadata through search; use the
    // album id as a search key so the original UI can keep its album screen.
    const d=await new Spotify().search(id,10);
    const a=(d.albums||[])[0];
    if(!a)return res.status(404).json({status:false,message:'Album tidak ditemukan'});
    const songs=(d.tracks||[]).filter(t=>t.album?.id===a.id).map(t=>({videoId:t.id,title:t.name,artist:t.artists?.[0]?.name||'',duration:t.duration_ms?Math.round(t.duration_ms/1000):0,thumbnails:t.album?.images||[],url:t.url}));
    return res.status(200).json({status:true,result:{id:a.id,title:a.name,artist:a.artists?.[0]?.name||'',description:'',thumbnails:a.images||[],songs}});
  }catch(e){return res.status(502).json({status:false,message:e.message})}
};
