function allowedHost(hostname) {
  const h = hostname.toLowerCase();
  return h === "cdn-spotify.zm.io.vn" || h.endsWith(".zm.io.vn");
}

module.exports = async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  const src = String(req.query.src || "");
  if (!src) return res.status(400).json({ status: false, message: "src wajib diisi" });

  let target;
  try { target = new URL(src); } catch { return res.status(400).json({ status: false, message: "URL audio tidak valid" }); }
  if (target.protocol !== "https:" || !allowedHost(target.hostname)) {
    return res.status(403).json({ status: false, message: "Host audio tidak diizinkan" });
  }

  const headers = {};
  if (req.headers.range) headers.Range = req.headers.range;
  headers["User-Agent"] = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/153.0.0.0 Mobile Safari/537.36";
  headers.Accept = "audio/mpeg,audio/*;q=0.9,*/*;q=0.8";

  try {
    const upstream = await fetch(target, { headers });
    const out = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Cache-Control": "no-store"
    };
    for (const h of ["content-type","content-length","content-range","accept-ranges","etag","last-modified"]) {
      const v = upstream.headers.get(h);
      if (v) out[h] = v;
    }
    res.writeHead(upstream.status, out);
    if (req.method === "HEAD" || !upstream.body) return res.end();
    const reader = upstream.body.getReader();
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally { reader.releaseLock(); }
    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(502).json({ status: false, message: `Audio upstream gagal: ${e.message}` });
    else res.end();
  }
};
