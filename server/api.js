const crypto = require("crypto");
const {
  parseCookies,
  readBody,
  sendJson,
  setSessionCookie,
  clearSessionCookie,
  wantsJson,
  hasJsonBody
} = require("./lib/http");
const { menuRowToClient, newsRowToClient, userRowToClient } = require("./db");

const SESSION_DAYS = 7;
const sessions = new Map();

function createApi({ db, bcrypt }) {
  function loadUserById(id) {
    return userRowToClient(
      db
        .prepare(
          `SELECT id, login, is_admin, first_name, last_name, middle_name, phone, email
           FROM users WHERE id = ?`
        )
        .get(id)
    );
  }

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

  function requireAuth(req, res) {
    const cookies = parseCookies(req.headers.cookie);
    const user = getSessionUser(cookies.session);
    if (!user) {
      sendJson(res, 401, { error: "Нужно войти в аккаунт" });
      return null;
    }
    return user;
  }

  function requireAdmin(req, res) {
    const user = requireAuth(req, res);
    if (!user) return null;
    if (!user.isAdmin) {
      sendJson(res, 403, { error: "Доступ только для администратора" });
      return null;
    }
    return user;
  }

  async function readJsonBody(req, res) {
    if (wantsJson(req) && !hasJsonBody(req)) {
      sendJson(res, 415, { error: "Ожидается Content-Type: application/json" });
      return null;
    }
    try {
      return await readBody(req);
    } catch (e) {
      if (e.message === "BODY_TOO_LARGE") {
        sendJson(res, 413, { error: "Слишком большой запрос" });
      } else {
        sendJson(res, 400, { error: "Некорректный JSON" });
      }
      return null;
    }
  }

  function updateUserProfile(sessionUser, body) {
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
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, sessionUser.id);
    } else if (field === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { status: 400, data: { error: "Некорректный email" } };
    } else {
      db.prepare(`UPDATE users SET ${allowed[field]} = ? WHERE id = ?`).run(value, sessionUser.id);
    }

    return { status: 200, data: { user: loadUserById(sessionUser.id) } };
  }

  function listMenu() {
    const rows = db
      .prepare(
        `SELECT id, title, description, meta, price, image, is_new
         FROM menu_items
         WHERE is_active = 1
         ORDER BY sort_order, id`
      )
      .all();
    return rows.map(menuRowToClient);
  }

  function listNews() {
    const rows = db
      .prepare(
        `SELECT id, title, date_label, body
         FROM news
         ORDER BY id DESC`
      )
      .all();
    return rows.map(newsRowToClient);
  }

  function parseMenuInput(body) {
    const title = String(body.nazvanie ?? body.title ?? "").trim();
    const price = Number(body.cena ?? body.price);
    const image = String(body.image ?? "").trim() || "assets/coffee-1.svg";
    const description = String(body.opis ?? body.description ?? "").trim() || "Авторская позиция";
    const meta = String(body.meta ?? "").trim() || "порция";
    const isNew = Boolean(body.isNew);

    if (!title || Number.isNaN(price) || price < 0) {
      return { error: "Укажите название и корректную цену" };
    }

    return { title, price, image, description, meta, isNew };
  }

  function parseNewsInput(body) {
    const title = String(body.title ?? "").trim();
    const dateLabel = String(body.date ?? body.dateLabel ?? "").trim();
    const text = String(body.text ?? body.body ?? "").trim();

    if (!title || !dateLabel || !text) {
      return { error: "Заполните заголовок, дату и текст" };
    }

    return { title, dateLabel, text };
  }

  async function handleApi(req, res, pathnameRaw) {
    const pathname = pathnameRaw.replace(/\/+$/, "") || "/";
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.session;

    if (pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, { ok: true, apiVersion: 3 });
      return;
    }

    if (pathname === "/api/me" && req.method === "GET") {
      const user = getSessionUser(token);
      sendJson(res, 200, { user: user || null });
      return;
    }

    if (pathname === "/api/me/update" && req.method === "POST") {
      const sessionUser = requireAuth(req, res);
      if (!sessionUser) return;

      const body = await readJsonBody(req, res);
      if (body === null) return;

      try {
        const result = updateUserProfile(sessionUser, body);
        sendJson(res, result.status, result.data);
      } catch (e) {
        console.error("profile update:", e);
        sendJson(res, 500, { error: "Ошибка базы данных" });
      }
      return;
    }

    if (pathname === "/api/register" && req.method === "POST") {
      const body = await readJsonBody(req, res);
      if (body === null) return;

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
        .prepare("INSERT INTO users (login, password_hash, is_admin) VALUES (?, ?, 0)")
        .run(login, hash);
      const session = createSession(info.lastInsertRowid);
      setSessionCookie(res, session.token, session.expires);
      sendJson(res, 201, { ok: true, login });
      return;
    }

    if (pathname === "/api/login" && req.method === "POST") {
      const body = await readJsonBody(req, res);
      if (body === null) return;

      const login = String(body.login || "").trim();
      const password = String(body.password || "");
      const user = db.prepare("SELECT id, password_hash, is_admin FROM users WHERE login = ?").get(login);

      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        sendJson(res, 401, { error: "Неверный логин или пароль" });
        return;
      }

      const session = createSession(user.id);
      setSessionCookie(res, session.token, session.expires);
      sendJson(res, 200, { ok: true, isAdmin: Boolean(user.is_admin) });
      return;
    }

    if (pathname === "/api/logout" && req.method === "POST") {
      destroySession(token);
      clearSessionCookie(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/menu" && req.method === "GET") {
      sendJson(res, 200, { items: listMenu() });
      return;
    }

    if (pathname === "/api/news" && req.method === "GET") {
      sendJson(res, 200, { items: listNews() });
      return;
    }

    if (pathname === "/api/orders" && req.method === "POST") {
      const sessionUser = requireAuth(req, res);
      if (!sessionUser) return;

      const body = await readJsonBody(req, res);
      if (body === null) return;

      const clientName = String(
        body.clientName ?? body.client ?? (sessionUser.firstName || sessionUser.login)
      ).trim();
      const clientPhone = String(body.clientPhone ?? body.phone ?? sessionUser.phone).trim();
      const items = Array.isArray(body.items) ? body.items : [];

      if (!clientName || !clientPhone) {
        sendJson(res, 400, { error: "Заполните имя и телефон" });
        return;
      }
      if (!items.length) {
        sendJson(res, 400, { error: "Корзина пустая" });
        return;
      }

      const normalized = items
        .map((item) => ({
          title: String(item.nazvanie ?? item.title ?? "").trim(),
          price: Number(item.cena ?? item.price),
          qty: Math.max(1, Number(item.qty) || 1)
        }))
        .filter((item) => item.title && !Number.isNaN(item.price) && item.price >= 0);

      if (!normalized.length) {
        sendJson(res, 400, { error: "Некорректные позиции заказа" });
        return;
      }

      const total = normalized.reduce((sum, item) => sum + item.price * item.qty, 0);
      const orderInfo = db
        .prepare(
          "INSERT INTO orders (user_id, client_name, client_phone, total, status) VALUES (?, ?, ?, ?, 'new')"
        )
        .run(sessionUser.id, clientName, clientPhone, total);

      const insertItem = db.prepare(
        "INSERT INTO order_items (order_id, product_title, price, qty) VALUES (?, ?, ?, ?)"
      );
      for (const item of normalized) {
        insertItem.run(orderInfo.lastInsertRowid, item.title, item.price, item.qty);
      }

      sendJson(res, 201, { ok: true, orderId: orderInfo.lastInsertRowid, total });
      return;
    }

    if (pathname === "/api/admin/orders" && req.method === "GET") {
      if (!requireAdmin(req, res)) return;

      const rows = db
        .prepare(
          `SELECT o.id, o.client_name, o.client_phone, o.total, o.status, o.created_at,
                  GROUP_CONCAT(oi.product_title || ' x' || oi.qty, ', ') AS items_summary
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           GROUP BY o.id
           ORDER BY o.created_at DESC
           LIMIT 50`
        )
        .all();

      sendJson(res, 200, {
        items: rows.map((row) => ({
          id: row.id,
          client: row.client_name,
          phone: row.client_phone,
          total: row.total,
          status: row.status,
          data: new Date(row.created_at).toLocaleString("ru-RU"),
          itemsSummary: row.items_summary || ""
        }))
      });
      return;
    }

    if (pathname === "/api/admin/menu" && req.method === "POST") {
      if (!requireAdmin(req, res)) return;

      const body = await readJsonBody(req, res);
      if (body === null) return;

      const parsed = parseMenuInput(body);
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error });
        return;
      }

      const sortOrder =
        db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM menu_items").get().next;
      const info = db
        .prepare(
          `INSERT INTO menu_items (title, description, meta, price, image, is_new, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          parsed.title,
          parsed.description,
          parsed.meta,
          parsed.price,
          parsed.image,
          parsed.isNew ? 1 : 0,
          sortOrder
        );

      const row = db
        .prepare(
          "SELECT id, title, description, meta, price, image, is_new FROM menu_items WHERE id = ?"
        )
        .get(info.lastInsertRowid);
      sendJson(res, 201, { item: menuRowToClient(row) });
      return;
    }

    const menuMatch = pathname.match(/^\/api\/admin\/menu\/(\d+)$/);
    if (menuMatch && req.method === "PUT") {
      if (!requireAdmin(req, res)) return;

      const id = Number(menuMatch[1]);
      const existing = db.prepare("SELECT id FROM menu_items WHERE id = ?").get(id);
      if (!existing) {
        sendJson(res, 404, { error: "Позиция не найдена" });
        return;
      }

      const body = await readJsonBody(req, res);
      if (body === null) return;

      const parsed = parseMenuInput(body);
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error });
        return;
      }

      db.prepare(
        `UPDATE menu_items
         SET title = ?, description = ?, meta = ?, price = ?, image = ?, is_new = ?
         WHERE id = ?`
      ).run(
        parsed.title,
        parsed.description,
        parsed.meta,
        parsed.price,
        parsed.image,
        parsed.isNew ? 1 : 0,
        id
      );

      const row = db
        .prepare(
          "SELECT id, title, description, meta, price, image, is_new FROM menu_items WHERE id = ?"
        )
        .get(id);
      sendJson(res, 200, { item: menuRowToClient(row) });
      return;
    }

    if (menuMatch && req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;

      const id = Number(menuMatch[1]);
      const info = db.prepare("UPDATE menu_items SET is_active = 0 WHERE id = ?").run(id);
      if (!info.changes) {
        sendJson(res, 404, { error: "Позиция не найдена" });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    if (pathname === "/api/admin/news" && req.method === "POST") {
      if (!requireAdmin(req, res)) return;

      const body = await readJsonBody(req, res);
      if (body === null) return;

      const parsed = parseNewsInput(body);
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error });
        return;
      }

      const info = db
        .prepare("INSERT INTO news (title, date_label, body) VALUES (?, ?, ?)")
        .run(parsed.title, parsed.dateLabel, parsed.text);
      const row = db.prepare("SELECT id, title, date_label, body FROM news WHERE id = ?").get(info.lastInsertRowid);
      sendJson(res, 201, { item: newsRowToClient(row) });
      return;
    }

    const newsMatch = pathname.match(/^\/api\/admin\/news\/(\d+)$/);
    if (newsMatch && req.method === "PUT") {
      if (!requireAdmin(req, res)) return;

      const id = Number(newsMatch[1]);
      const existing = db.prepare("SELECT id FROM news WHERE id = ?").get(id);
      if (!existing) {
        sendJson(res, 404, { error: "Новость не найдена" });
        return;
      }

      const body = await readJsonBody(req, res);
      if (body === null) return;

      const parsed = parseNewsInput(body);
      if (parsed.error) {
        sendJson(res, 400, { error: parsed.error });
        return;
      }

      db.prepare("UPDATE news SET title = ?, date_label = ?, body = ? WHERE id = ?").run(
        parsed.title,
        parsed.dateLabel,
        parsed.text,
        id
      );
      const row = db.prepare("SELECT id, title, date_label, body FROM news WHERE id = ?").get(id);
      sendJson(res, 200, { item: newsRowToClient(row) });
      return;
    }

    if (newsMatch && req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;

      const id = Number(newsMatch[1]);
      const info = db.prepare("DELETE FROM news WHERE id = ?").run(id);
      if (!info.changes) {
        sendJson(res, 404, { error: "Новость не найдена" });
        return;
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: `Маршрут не найден: ${req.method} ${pathname}` });
  }

  return { handleApi, getSessionUser };
}

module.exports = { createApi };
