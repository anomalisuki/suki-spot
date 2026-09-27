module.exports = async (req,res)=>{
  if(req.method!=='GET') return res.status(405).end();
  const url=String(req.query.url||'');
  if(!/^https:\/\//i.test(url)) return res.status(400).end();
  return res.redirect(307,url);
};
