const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const { openDatabase, seedMenu, seedNews, seedAdmin, dbPath } = require("./db");
const { createApi } = require("./api");
const { sendJson } = require("./lib/http");

let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  console.error("Установите зависимости: npm install");
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
const rootDir = path.join(__dirname, "..");
const baseDir = path.join(rootDir, "public");

const blockedPathPrefixes = ["/data/", "/server/", "/sql/", "/node_modules/"];
const blockedExtensions = new Set([".db", ".sql", ".env"]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const db = openDatabase();
seedMenu(db);
seedNews(db);
seedAdmin(db, bcrypt);

const { handleApi } = createApi({ db, bcrypt });

function isBlockedStaticPath(pathname) {
  const lower = pathname.toLowerCase();
  if (blockedPathPrefixes.some((prefix) => lower.startsWith(prefix))) {
    return true;
  }
  const ext = path.extname(lower);
  return blockedExtensions.has(ext);
}

function serveStatic(req, res) {
  const cleanUrl = decodeURIComponent((req.url || "/").split("?")[0]);

  if (isBlockedStaticPath(cleanUrl)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  let requested = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const safePath = path.normalize(path.join(baseDir, requested));

  if (!safePath.startsWith(baseDir)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      requested = path.join(requested, "index.html");
    }

    const finalPath = path.normalize(path.join(baseDir, requested));

    if (!finalPath.startsWith(baseDir) || isBlockedStaticPath(requested)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.readFile(finalPath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const ext = path.extname(finalPath).toLowerCase();
      const type = contentTypes[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    });
  });
}

const serverInstance = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    try {
      await handleApi(req, res, pathname);
    } catch (e) {
      console.error(e);
      sendJson(res, 500, { error: "Ошибка сервера" });
    }
    return;
  }

  serveStatic(req, res);
});

serverInstance.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\nПорт ${port} занят. Выполните: npm start`);
    console.error("Скрипт сам освободит порт. Либо закройте старый терминал с сервером.\n");
  }
  throw err;
});

serverInstance.listen(port, () => {
  console.log(`Сервер: http://localhost:${port}`);
  console.log(`БД (только сервер): ${dbPath}`);
});
