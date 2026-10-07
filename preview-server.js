// Локален преглед: node preview-server.js  →  http://127.0.0.1:8765/
const http = require("http"), fs = require("fs"), path = require("path");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
http.createServer((req, res) => {
  const clean = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(__dirname, clean === "/" ? "index.html" : clean);
  if (!file.startsWith(__dirname) || /(^|\/)(backend|\.git)(\/|$)/.test(clean)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(8765, "127.0.0.1", () => console.log("http://127.0.0.1:8765/"));
