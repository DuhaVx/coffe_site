-- SQLite: примеры запросов для проекта ВОЛНА
-- Выполнять в DBeaver на файле server/storage/volna.db

-- Активное меню
SELECT id, title, price, description, meta, is_new
FROM menu_items
WHERE is_active = 1
ORDER BY sort_order, id;

-- Новости
SELECT id, title, date_label, body, created_at
FROM news
ORDER BY id DESC;

-- Заказы с клиентами
SELECT
  o.id AS order_id,
  o.status,
  o.total,
  o.created_at,
  o.client_name,
  o.client_phone,
  u.login AS user_login
FROM orders o
LEFT JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC;

-- Популярные позиции по заказам
SELECT
  oi.product_title,
  SUM(oi.qty) AS sold_qty,
  SUM(oi.qty * oi.price) AS revenue
FROM order_items oi
GROUP BY oi.product_title
ORDER BY sold_qty DESC, revenue DESC;

-- Выручка по дням
SELECT
  date(o.created_at) AS day,
  COUNT(*) AS orders_count,
  SUM(o.total) AS revenue_sum
FROM orders o
GROUP BY date(o.created_at)
ORDER BY day DESC;

-- Состав конкретного заказа
SELECT
  o.id AS order_id,
  oi.product_title,
  oi.qty,
  oi.price,
  (oi.qty * oi.price) AS line_sum
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.id = 1;

-- Зарегистрированные пользователи (без паролей)
SELECT id, login, is_admin, first_name, last_name, phone, email, created_at
FROM users
ORDER BY id;
