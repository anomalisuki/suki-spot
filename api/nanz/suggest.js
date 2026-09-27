const { Spotify } = require('../../lib/spotify');
module.exports = async (req,res)=>{
  if(req.method!=='GET') return res.status(405).json([]);
  const q=String(req.query.q||'').trim();
  if(!q) return res.status(200).json([]);
  try{
    const d=await new Spotify().search(q,5);
    const out=[];
    (d.tracks||[]).forEach(t=>{if(t.name&&!out.includes(t.name))out.push(t.name)});
    (d.artists||[]).forEach(a=>{if(a.name&&!out.includes(a.name))out.push(a.name)});
    return res.status(200).json(out.slice(0,8));
  }catch{return res.status(200).json([])}
};
