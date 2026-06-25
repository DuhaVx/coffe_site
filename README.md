
# ВОЛНА

Дипломный проект: сайт кофейни с корзиной, авторизацией и SQLite-базой данных (локально или Turso Cloud).

## Запуск локально

```bash
npm install
npm start
```

Сайт: [http://localhost:3000](http://localhost:3000)

Локально база хранится в `server/storage/volna.db`.


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
