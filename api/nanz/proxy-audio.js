module.exports = async (req,res)=>{
  if(!['GET','HEAD'].includes(req.method)) return res.status(405).end();
  const url=String(req.query.url||'');
  if(!url) return res.status(400).json({status:false,message:'url wajib diisi'});
  return res.redirect(307,'/api/stream?src='+encodeURIComponent(url));
};
