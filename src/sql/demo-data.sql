insert into customers (full_name, phone, email) values
('Аня К.', '+7 (921) 001-10-11', 'anya.k@example.com'),
('Рома П.', '+7 (921) 001-10-12', 'roma.p@example.com'),
('Лера Н.', '+7 (921) 001-10-13', 'lera.n@example.com'),
('Дима С.', '+7 (921) 001-10-14', 'dima.s@example.com'),
('Оля В.', '+7 (921) 001-10-15', 'olya.v@example.com'),
('Костя Б.', '+7 (921) 001-10-16', 'kostya.b@example.com'),
('Ира Л.', '+7 (921) 001-10-17', 'ira.l@example.com');

insert into orders (cafe_id, customer_id, status, comment, created_at) values
(1, 2, 'paid', 'Без крышки', now() - interval '6 day'),
(1, 3, 'done', 'Пакет не нужен', now() - interval '6 day'),
(1, 4, 'done', 'Погорячее', now() - interval '5 day'),
(1, 5, 'cooking', 'С собой', now() - interval '5 day'),
(1, 6, 'cancelled', 'Передумал', now() - interval '4 day'),
(1, 7, 'paid', 'Добавить салфетки', now() - interval '4 day'),
(1, 8, 'done', 'Без сиропа', now() - interval '3 day'),
(1, 1, 'new', 'Позвонить на месте', now() - interval '3 day'),
(1, 2, 'paid', 'Обычный стакан', now() - interval '2 day'),
(1, 3, 'done', 'Побыстрее', now() - interval '2 day'),
(1, 4, 'done', 'Без сахара', now() - interval '1 day'),
(1, 5, 'cooking', 'С корицей', now() - interval '1 day'),
(1, 6, 'new', 'Тихий столик', now() - interval '12 hour'),
(1, 7, 'paid', 'Без молока', now() - interval '8 hour'),
(1, 8, 'done', 'На вынос', now() - interval '3 hour');

insert into order_items (order_id, product_id, qty, price_at_moment) values
(2, 1, 1, 320),
(2, 5, 1, 210),
(3, 2, 2, 180),
(4, 3, 1, 260),
(4, 6, 1, 230),
(5, 4, 1, 240),
(6, 1, 1, 320),
(6, 2, 1, 180),
(7, 3, 2, 260),
(8, 5, 2, 210),
(9, 6, 1, 230),
(9, 4, 1, 240),
(10, 1, 1, 320),
(10, 3, 1, 260),
(11, 2, 1, 180),
(12, 5, 1, 210),
(12, 6, 1, 230),
(13, 4, 2, 240),
(14, 3, 1, 260),
(14, 1, 1, 320),
(15, 2, 1, 180),
(15, 5, 1, 210),
(16, 6, 2, 230);

update orders
set total_sum = (
  select coalesce(sum(oi.qty * oi.price_at_moment), 0)
  from order_items oi
  where oi.order_id = orders.id
);
