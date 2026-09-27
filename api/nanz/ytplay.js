const { getAudio } = require('../../lib/downloader');
module.exports = async (req,res)=>{
  if(req.method!=='POST') return res.status(405).json({status:false,message:'Method not allowed'});
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{body={}}}
  const query=String(body.query||body.url||'').trim();
  if(!/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/i.test(query)) return res.status(400).json({status:false,message:'Gunakan URL Spotify track.'});
  try{
    const a=await getAudio(query);
    return res.status(200).json({status:true,result:{download:{audio:a.download_url,title:a.title,artist:a.artist,thumbnail:a.thumbnail,duration:a.duration},audio:a.download_url,stream_url:`/api/stream?src=${encodeURIComponent(a.download_url)}`}});
  }catch(e){return res.status(502).json({status:false,message:e.message});}
};
