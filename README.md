# ВОЛНА

Учебный проект: сайт кофейни с корзиной, авторизацией (SQLite) и отдельной SQL-частью на PostgreSQL.

## Запуск

```bash
npm install
npm start
```

Сайт: [http://localhost:3000](http://localhost:3000)

## Структура проекта

```
coffe_site/
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
└── src/
    ├── server.js
    ├── index.html, login.html, register.html, profile.html, menu.html
    ├── style.css
    ├── auth.js, script.js, cart.js, menu-store.js, menu-page.js, profile.js
    ├── assets/
    ├── data/
    ├── sql/
    └── tools/
```

## SQL-часть (PostgreSQL)

```bash
psql -U your_user -d your_db -f src/sql/database.sql
psql -U your_user -d your_db -f src/sql/demo-data.sql
psql -U your_user -d your_db -f src/sql/queries.sql
```

## Данные для аккаунта администратора

- логин: `admin`
- пароль: `admin`
