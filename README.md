# ВОЛНА

Дипломный проект: сайт кофейни с корзиной, авторизацией и SQLite-базой данных (локально или Turso Cloud).

## Запуск локально

```bash
npm install
npm start
```

Сайт: [http://localhost:3000](http://localhost:3000)

Локально база хранится в `server/storage/volna.db`. Переменные Turso не нужны.

## Подключение Turso

[Turso](https://turso.tech) — облачный SQLite (libSQL). Проект автоматически переключается на Turso, если заданы переменные окружения.

### 1. Получите URL и токен базы

**Способ A — через сайт (без CLI, проще всего):**

1. Зарегистрируйтесь на [turso.tech](https://turso.tech)
2. **Create Database** → имя, например `volna-coffee`
3. Откройте базу → скопируйте **Database URL** (`libsql://...`)
4. **Create Token** → скопируйте токен

**Способ B — через CLI (команда `turso auth login`):**

> **Важно:** установщик с GitHub (`turso_cli-installer.ps1`) ставит **`tursodb`** — SQL-оболочку, а не облачный CLI. Команды `turso auth login` / `turso db create` там не работают.

На Windows облачный CLI проще всего поставить через **WSL**:

```bash
wsl
curl -sSfL https://get.tur.so/install.sh | bash
exit
```

В новом окне WSL:

```bash
turso auth login
turso db create volna-coffee
turso db show volna-coffee --url
turso db tokens create volna-coffee
```

Если WSL нет — используйте **Способ A** (сайт turso.tech), CLI не обязателен.

Другие ОС: [docs.turso.tech/cli/installation](https://docs.turso.tech/cli/installation)

### 2. Настройте `.env`

Скопируйте `.env.example` в `.env` и вставьте значения:

```env
TURSO_DATABASE_URL=libsql://volna-coffee-....turso.io
TURSO_AUTH_TOKEN=eyJ...
```

### 3. Инициализируйте схему и демо-данные

```bash
npm run db:init
```

### 4. Запустите сервер с Turso

```bash
npm start
```

Проверка: `GET /api/health` вернёт `"db": "turso"`.

### DBeaver и Turso

DBeaver не подключается к Turso напрямую как к файлу. Варианты:

- локальная разработка — `server/storage/volna.db`;
- облако — [Turso Dashboard](https://turso.tech) или CLI: `turso db shell volna-coffee`.

## Деплой

Подходит любой хостинг с Node.js и переменными окружения. Рекомендуется **Render** (есть `render.yaml` в репозитории).

### Render

1. Зарегистрируйтесь на [render.com](https://render.com).
2. Подключите GitHub-репозиторий.
3. **New → Blueprint** (или Web Service) — Render подхватит `render.yaml`.
4. В Environment добавьте:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
5. Deploy.

**Start command:** `node server/index.js`  
**Build command:** `npm install`

Перед первым деплоем выполните локально `npm run db:init` с Turso-переменными — схема и admin создадутся в облаке.

### Railway / Fly.io

Аналогично:

- Build: `npm install`
- Start: `npm run start:prod` или `node server/index.js`
- Env: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `PORT` (обычно задаётся платформой)

## Структура проекта

```
volna-coffee/
├── server/
│   ├── index.js
│   ├── api.js
│   ├── db/
│   └── storage/          # локальная БД (в .gitignore)
├── public/               # фронтенд
├── scripts/
│   ├── free-port.js
│   └── db-init.js        # инициализация Turso
├── sql/
│   ├── schema.sql
│   └── queries.sql
├── .env.example
└── render.yaml
```

## Администратор

- логин: `admin`
- пароль: `admin`

Создаётся автоматически при первом запуске или `npm run db:init`.
