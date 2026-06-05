const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

let Database;
let bcrypt;
try {
  Database = require("better-sqlite3");
  bcrypt = require("bcryptjs");
} catch (e) {
  console.error("Установите зависимости: npm install");
  process.exit(1);
}

const port = Number(process.env.PORT) || 3000;
const baseDir = __dirname;
const dbPath = path.join(baseDir, "data", "users.db");

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

fs.mkdirSync(path.join(baseDir, "data"), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_plain TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    middle_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
const extraCols = [
  ["first_name", "TEXT NOT NULL DEFAULT ''"],
  ["last_name", "TEXT NOT NULL DEFAULT ''"],
  ["middle_name", "TEXT NOT NULL DEFAULT ''"],
  ["phone", "TEXT NOT NULL DEFAULT ''"],
  ["email", "TEXT NOT NULL DEFAULT ''"]
];
for (const [name, def] of extraCols) {
  if (!userColumns.includes(name)) {
    db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
  }
}

function rowToUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    password: row.password_plain,
    isAdmin: Boolean(row.is_admin),
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    middleName: row.middle_name || "",
    phone: row.phone || "",
    email: row.email || ""
  };
}

function loadUserById(id) {
  return rowToUser(
    db
      .prepare(
        `SELECT id, login, password_plain, is_admin, first_name, last_name, middle_name, phone, email
         FROM users WHERE id = ?`
      )
      .get(id)
  );
}

const adminExists = db.prepare("SELECT id FROM users WHERE login = ?").get("admin");
if (!adminExists) {
  const hash = bcrypt.hashSync("admin", 10);
  db.prepare(
    "INSERT INTO users (login, password_hash, password_plain, is_admin) VALUES (?, ?, ?, 1)"
  ).run("admin", hash, "admin");
  console.log("Создан админ: логин admin, пароль admin");
}

const SESSION_DAYS = 7;
const sessions = new Map();

function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  const expiresIso = expires.toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expiresIso
  );
  sessions.set(token, { userId, expires: expires.getTime() });
  return { token, expires };
}

function getSessionUser(token) {
  if (!token) return null;
  let cached = sessions.get(token);
  if (!cached) {
    const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").get(token);
    if (!row) return null;
    cached = { userId: row.user_id, expires: new Date(row.expires_at).getTime() };
    sessions.set(token, cached);
  }
  if (Date.now() > cached.expires) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    sessions.delete(token);
    return null;
  }
  return loadUserById(cached.userId);
}

function destroySession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  sessions.delete(token);
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = decodeURIComponent(rest.join("="));
  });
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function setSessionCookie(res, token, expires) {
  const maxAge = Math.floor((expires.getTime() - Date.now()) / 1000);
  res.setHeader(
    "Set-Cookie",
    `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

async function updateUserProfile(sessionUser, body) {
  const field = String(body.field || "");
  const value = String(body.value ?? "").trim();
  const allowed = {
    login: "login",
    password: "password",
    firstName: "first_name",
    lastName: "last_name",
    middleName: "middle_name",
    phone: "phone",
    email: "email"
  };

  if (!allowed[field]) {
    return { status: 400, data: { error: "Неизвестное поле" } };
  }

  if (field === "login") {
    if (value.length < 3) {
      return { status: 400, data: { error: "Логин: минимум 3 символа" } };
    }
    const taken = db.prepare("SELECT id FROM users WHERE login = ? AND id != ?").get(value, sessionUser.id);
    if (taken) {
      return { status: 409, data: { error: "Такой логин уже занят" } };
    }
    db.prepare("UPDATE users SET login = ? WHERE id = ?").run(value, sessionUser.id);
  } else if (field === "password") {
    if (value.length < 4) {
      return { status: 400, data: { error: "Пароль: минимум 4 символа" } };
    }
    const hash = bcrypt.hashSync(value, 10);
    db.prepare("UPDATE users SET password_hash = ?, password_plain = ? WHERE id = ?").run(
      hash,
      value,
      sessionUser.id
    );
  } else if (field === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return { status: 400, data: { error: "Некорректный email" } };
  } else {
    db.prepare(`UPDATE users SET ${allowed[field]} = ? WHERE id = ?`).run(value, sessionUser.id);
  }

  return { status: 200, data: { user: loadUserById(sessionUser.id) } };
}

async function handleApi(req, res, pathnameRaw) {
  const pathname = pathnameRaw.replace(/\/+$/, "") || "/";
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.session;

  if (pathname === "/api/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, apiVersion: 2, profileUpdate: true });
    return;
  }

  if (pathname === "/api/me" && req.method === "GET") {
    const user = getSessionUser(token);
    if (!user) {
      sendJson(res, 200, { user: null });
      return;
    }
    sendJson(res, 200, { user });
    return;
  }

  const isProfileUpdate =
    (pathname === "/api/profile" && (req.method === "PATCH" || req.method === "POST")) ||
    (pathname === "/api/profile/update" && req.method === "POST") ||
    (pathname === "/api/me/update" && req.method === "POST");

  if (isProfileUpdate) {
    const sessionUser = getSessionUser(token);
    if (!sessionUser) {
      sendJson(res, 401, { error: "Нужно войти в аккаунт" });
      return;
    }
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 400, { error: "Некорректный JSON" });
      return;
    }
    try {
      const result = await updateUserProfile(sessionUser, body);
      sendJson(res, result.status, result.data);
    } catch (e) {
      console.error("profile update:", e);
      sendJson(res, 500, { error: "Ошибка базы данных. Перезапустите сервер (npm start)" });
    }
    return;
  }

  if (pathname === "/api/register" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 400, { error: "Некорректный JSON" });
      return;
    }
    const login = String(body.login || "").trim();
    const password = String(body.password || "");
    if (login.length < 3) {
      sendJson(res, 400, { error: "Логин: минимум 3 символа" });
      return;
    }
    if (password.length < 4) {
      sendJson(res, 400, { error: "Пароль: минимум 4 символа" });
      return;
    }
    const exists = db.prepare("SELECT id FROM users WHERE login = ?").get(login);
    if (exists) {
      sendJson(res, 409, { error: "Такой логин уже занят" });
      return;
    }
    const hash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare(
        "INSERT INTO users (login, password_hash, password_plain, is_admin) VALUES (?, ?, ?, 0)"
      )
      .run(login, hash, password);
    const session = createSession(info.lastInsertRowid);
    setSessionCookie(res, session.token, session.expires);
    sendJson(res, 201, { ok: true, login });
    return;
  }

  if (pathname === "/api/login" && req.method === "POST") {
    let body;
    try {
      body = await readBody(req);
    } catch {
      sendJson(res, 400, { error: "Некорректный JSON" });
      return;
    }
    const login = String(body.login || "").trim();
    const password = String(body.password || "");
    const user = db
      .prepare("SELECT id, password_hash, is_admin FROM users WHERE login = ?")
      .get(login);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      sendJson(res, 401, { error: "Неверный логин или пароль" });
      return;
    }
    const session = createSession(user.id);
    setSessionCookie(res, session.token, session.expires);
    sendJson(res, 200, {
      ok: true,
      isAdmin: Boolean(user.is_admin)
    });
    return;
  }

  if (pathname === "/api/logout" && req.method === "POST") {
    destroySession(token);
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: `Маршрут не найден: ${req.method} ${pathname}` });
}

function serveStatic(req, res) {
  const cleanUrl = decodeURIComponent((req.url || "/").split("?")[0]);
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
  console.log(`БД пользователей: ${dbPath}`);
  console.log("API профиля: POST /api/me/update");
});
