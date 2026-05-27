select id, title, category, price
from menu_showcase;

select
  o.id as order_id,
  o.status,
  o.total_sum,
  o.created_at,
  coalesce(cu.full_name, 'Гость') as customer
from orders o
left join customers cu on cu.id = o.customer_id
order by o.created_at desc;

select
  p.title,
  sum(oi.qty) as sold_qty,
  sum(oi.qty * oi.price_at_moment) as revenue
from order_items oi
join products p on p.id = oi.product_id
group by p.title
order by sold_qty desc, revenue desc;

select
  date_trunc('day', o.created_at) as day,
  count(*) as orders_count,
  sum(o.total_sum) as revenue_sum
from orders o
group by date_trunc('day', o.created_at)
order by day desc;

select
  c.title as cafe,
  p.title as product,
  p.price
from products p
join cafes c on c.id = p.cafe_id
where p.is_active = true
order by p.price desc;

select
  o.id as order_id,
  p.title as product,
  oi.qty,
  oi.price_at_moment,
  (oi.qty * oi.price_at_moment) as line_sum
from order_items oi
join orders o on o.id = oi.order_id
join products p on p.id = oi.product_id
where o.id = 1;
