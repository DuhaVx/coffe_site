drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists customers cascade;
drop table if exists cafes cascade;

create table cafes (
  id bigserial primary key,
  title varchar(120) not null,
  city varchar(80) not null default 'Санкт-Петербург',
  address text not null,
  phone varchar(30),
  created_at timestamptz not null default now()
);

create table categories (
  id bigserial primary key,
  name varchar(80) not null unique
);

create table products (
  id bigserial primary key,
  cafe_id bigint not null references cafes(id) on delete cascade,
  category_id bigint references categories(id) on delete set null,
  title varchar(160) not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id bigserial primary key,
  full_name varchar(120),
  phone varchar(30),
  email varchar(120) unique,
  created_at timestamptz not null default now()
);

create table orders (
  id bigserial primary key,
  cafe_id bigint not null references cafes(id) on delete restrict,
  customer_id bigint references customers(id) on delete set null,
  status varchar(30) not null default 'new' check (status in ('new','paid','cooking','done','cancelled')),
  total_sum numeric(10,2) not null default 0 check (total_sum >= 0),
  comment text,
  created_at timestamptz not null default now()
);

create table order_items (
  id bigserial primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint not null references products(id) on delete restrict,
  qty integer not null check (qty > 0),
  price_at_moment numeric(10,2) not null check (price_at_moment >= 0),
  unique(order_id, product_id)
);

create index idx_products_cafe on products(cafe_id);
create index idx_products_active on products(is_active);
create index idx_orders_cafe on orders(cafe_id);
create index idx_orders_created_at on orders(created_at);
create index idx_order_items_order on order_items(order_id);
create index idx_order_items_product on order_items(product_id);

create or replace function recalc_order_total(p_order_id bigint)
returns void
language plpgsql
as $$
begin
  update orders
  set total_sum = coalesce((
    select sum(qty * price_at_moment)
    from order_items
    where order_id = p_order_id
  ), 0)
  where id = p_order_id;
end;
$$;

create or replace function trg_order_items_recalc()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform recalc_order_total(old.order_id);
    return old;
  else
    perform recalc_order_total(new.order_id);
    return new;
  end if;
end;
$$;

drop trigger if exists order_items_recalc_total on order_items;

create trigger order_items_recalc_total
after insert or update or delete on order_items
for each row
execute function trg_order_items_recalc();

create or replace view menu_showcase as
select
  p.id,
  p.title,
  c.name as category,
  p.price,
  p.description
from products p
left join categories c on c.id = p.category_id
where p.is_active = true
order by p.title;

insert into cafes (title, address, phone)
values ('Обводный Канал', 'наб. Обводного канала, 74Б, Санкт-Петербург', '+7 (812) 555-04-17');

insert into categories (name)
values ('Кофе'), ('Напитки'), ('Выпечка');

insert into products (cafe_id, category_id, title, description, price)
values
  (1, 1, 'Раф "Циолковский"', 'Сливочный раф с ванилью', 320),
  (1, 1, 'Эспрессо "Смена"', 'Классический шот, плотный вкус', 180),
  (1, 1, 'Фильтр "Обводный"', 'Светлая обжарка, фруктовый профиль', 260),
  (1, 2, 'Какао "Кирпич"', 'Тягучее какао на молоке', 240),
  (1, 3, 'Круассан с солью', 'Слоеный, с хрустящей коркой', 210),
  (1, 3, 'Шу с облепихой', 'Заварное пирожное с кремом', 230);

insert into customers (full_name, phone, email)
values ('Илья М.', '+7 (911) 123-45-67', 'ilya.student@example.com');

insert into orders (cafe_id, customer_id, status, comment)
values (1, 1, 'new', 'Без сахара и побыстрее');

insert into order_items (order_id, product_id, qty, price_at_moment)
values
  (1, 1, 1, 320),
  (1, 6, 2, 230);

update orders
set total_sum = (
  select coalesce(sum(qty * price_at_moment), 0)
  from order_items
  where order_id = orders.id
);
