const { findLyrics } = require('../../lib/lrclib');
module.exports = async (req,res)=>{
  if(req.method!=='GET') return res.status(405).json({status:false,message:'Method not allowed'});
  const title=String(req.query.title||req.query.track||'').trim();
  const artist=String(req.query.artist||'').trim();
  if(!title) return res.status(400).json({status:false,message:'title wajib diisi.'});
  try{
    const d=await findLyrics(title,artist||null);
    if(!d.status) return res.status(404).json(d);
    return res.status(200).json({status:true,result:{lyrics:{type:d.syncedLyrics?'synced':'plain',lines:d.lines||[],plainLyrics:d.plainLyrics||null,syncedLyrics:d.syncedLyrics||null}}});
  }catch(e){return res.status(502).json({status:false,message:e.message});}
};
