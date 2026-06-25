const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

const storageDir = path.join(__dirname, "..", "storage");
const dbPath = process.env.DB_PATH || path.join(storageDir, "volna.db");
const schemaPath = path.join(__dirname, "schema.sql");

const DEFAULT_MENU = [
  { title: 'Раф "Циолковский"', price: 320, image: "assets/menu-raf.jpg", description: "Сливочный раф с мягкой ванильной нотой", meta: "300 мл", isNew: false },
  { title: 'Эспрессо "Смена"', price: 180, image: "assets/menu-espresso.jpg", description: "Плотный шот, горький шоколад и сухой орех", meta: "30 мл", isNew: false },
  { title: 'Фильтр "Обводный"', price: 260, image: "assets/menu-filter.jpg", description: "Спокойная чашка для длинного разговора", meta: "250 мл", isNew: true },
  { title: 'Какао "Кирпич"', price: 240, image: "assets/menu-cacao.jpg", description: "Густое какао на молоке, без лишней сладости", meta: "280 мл", isNew: false },
  { title: "Круассан с солью", price: 210, image: "assets/menu-croissant.jpg", description: "Хрустящее тесто и сливочное послевкусие", meta: "95 г", isNew: false },
  { title: "Шу с облепихой", price: 230, image: "assets/menu-choux.jpg", description: "Заварное тесто и яркий кислый крем", meta: "120 г", isNew: true }
];

const DEFAULT_NEWS = [
  { title: "Новая партия из Минас-Жерайс", dateLabel: "27 мая", body: "Привезли свежую Бразилию под фильтр. Вкус: какао, орех, сухофрукты. Будет в меню до конца недели." },
  { title: "Обновили вечерний спешл", dateLabel: "25 мая", body: "После 19:00 делаем сет: эспрессо + мини-шу по фиксированной цене. Хотели сделать просто по-соседски." }
];

function createDbAdapter(client) {
  return {
    client,
    async exec(sql) {
      await client.executeMultiple(sql);
    },
    prepare(sql) {
      return {
        async get(...args) {
          const result = await client.execute({ sql, args });
          return result.rows[0];
        },
        async all(...args) {
          const result = await client.execute({ sql, args });
          return result.rows;
        },
        async run(...args) {
          const result = await client.execute({ sql, args });
          return {
            lastInsertRowid: Number(result.lastInsertRowid ?? 0),
            changes: Number(result.rowsAffected ?? 0)
          };
        }
      };
    }
  };
}

function readSchema(isRemote) {
  let schema = fs.readFileSync(schemaPath, "utf8");
  if (isRemote) {
    schema = schema.replace(/PRAGMA journal_mode = WAL;\s*/gi, "");
  } else {
    schema = `PRAGMA journal_mode = WAL;\n${schema}`;
  }
  return schema;
}

async function openDatabase() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  let client;
  let dbLabel;
  let mode;

  if (tursoUrl) {
    if (!tursoToken) {
      throw new Error("Задайте TURSO_AUTH_TOKEN вместе с TURSO_DATABASE_URL");
    }
    client = createClient({ url: tursoUrl, authToken: tursoToken });
    dbLabel = tursoUrl;
    mode = "turso";
  } else {
    fs.mkdirSync(storageDir, { recursive: true });
    const fileUrl = `file:${dbPath.replace(/\\/g, "/")}`;
    client = createClient({ url: fileUrl });
    dbLabel = dbPath;
    mode = "local";
  }

  const db = createDbAdapter(client);
  await db.exec(readSchema(Boolean(tursoUrl)));
  return { db, dbLabel, mode };
}

async function seedMenu(db) {
  const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM menu_items").get()).n);
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO menu_items (title, description, meta, price, image, is_new, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let index = 0; index < DEFAULT_MENU.length; index += 1) {
    const item = DEFAULT_MENU[index];
    await insert.run(item.title, item.description, item.meta, item.price, item.image, item.isNew ? 1 : 0, index);
  }
}

async function seedNews(db) {
  const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM news").get()).n);
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO news (title, date_label, body)
    VALUES (?, ?, ?)
  `);

  for (const item of DEFAULT_NEWS) {
    await insert.run(item.title, item.dateLabel, item.body);
  }
}

async function seedAdmin(db, bcrypt) {
  const admin = await db.prepare("SELECT id FROM users WHERE login = ?").get("admin");
  if (admin) return;

  const hash = bcrypt.hashSync("admin", 10);
  await db.prepare("INSERT INTO users (login, password_hash, is_admin) VALUES (?, ?, 1)").run("admin", hash);
  console.log("Создан админ: логин admin, пароль admin");
}

function menuRowToClient(row) {
  return {
    id: row.id,
    nazvanie: row.title,
    cena: row.price,
    image: row.image,
    opis: row.description,
    meta: row.meta,
    isNew: Boolean(row.is_new)
  };
}

function newsRowToClient(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date_label,
    text: row.body
  };
}

function userRowToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    isAdmin: Boolean(row.is_admin),
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    middleName: row.middle_name || "",
    phone: row.phone || "",
    email: row.email || ""
  };
}

module.exports = {
  dbPath,
  openDatabase,
  seedMenu,
  seedNews,
  seedAdmin,
  menuRowToClient,
  newsRowToClient,
  userRowToClient
};
