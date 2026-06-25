# ВОЛНА

Дипломный проект: сайт кофейни с корзиной, авторизацией и SQLite-базой данных.

## Запуск

```bash
npm install
npm start
```

Сайт: [http://localhost:3000](http://localhost:3000)

## Структура проекта

```
volna-coffee/
├── package.json
├── package-lock.json
├── .gitignore
├── README.md
├── server/
│   ├── index.js          # HTTP-сервер
│   ├── api.js            # REST API
│   ├── db/               # инициализация SQLite
│   │   └── schema.sql    # схема (используется сервером)
│   └── storage/          # файл БД volna.db (в .gitignore)
├── scripts/
│   └── free-port.js      # освобождает порт перед запуском
├── public/               # фронтенд (раздаётся сервером)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── menu.html
│   ├── css/
│   ├── js/
│   └── assets/
└── sql/
    ├── schema.sql        # справочная схема SQLite
    └── queries.sql       # примеры SQL-запросов
```

## База данных (SQLite)

База создаётся автоматически при `npm start` в каталоге `server/storage/volna.db`. Через сайт к файлу БД доступа нет — только через API сервера.

Подключение в DBeaver: **SQLite** → путь к `server/storage/volna.db`.

Справочные SQL-файлы для диплома:

- `sql/schema.sql` — структура таблиц
- `sql/queries.sql` — примеры выборок

## Данные для аккаунта администратора

- логин: `admin`
- пароль: `admin`
