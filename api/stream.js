function allowedHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return (
    h === "spotsaver.net" ||
    h.endsWith(".spotsaver.net") ||
    h === "googlevideo.com" ||
    h.endsWith(".googlevideo.com") ||
    h === "googleusercontent.com" ||
    h.endsWith(".googleusercontent.com")
  );
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).end();
  }

  const src = String(req.query.src || "").trim();
  if (!src) return res.status(400).send("Missing src");

  let target;
  try {
    target = new URL(src);
  } catch {
    return res.status(400).send("Invalid source URL");
  }

  if (target.protocol !== "https:" || !allowedHost(target.hostname)) {
    return res.status(403).send("Source host not allowed");
  }

  const headers = {
    "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
    Accept: req.headers.accept || "*/*"
  };

  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(target.toString(), {
      method: req.method,
      headers,
      redirect: "follow"
    });

    const pass = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "etag",
      "last-modified"
    ];

    for (const key of pass) {
      const value = upstream.headers.get(key);
      if (value) res.setHeader(key, value);
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
    res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");

    res.status(upstream.status);

    if (req.method === "HEAD" || !upstream.body) return res.end();

    const reader = upstream.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) {
      res.status(502).send(`Audio upstream error: ${e.message}`);
    } else {
      res.end();
    }
  }
};
