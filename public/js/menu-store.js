const DEFAULT_MENU = [
  { id: 1, nazvanie: 'Раф "Циолковский"', cena: 320, image: "assets/menu-raf.jpg", opis: "Сливочный раф с мягкой ванильной нотой", meta: "300 мл", isNew: false },
  { id: 2, nazvanie: 'Эспрессо "Смена"', cena: 180, image: "assets/menu-espresso.jpg", opis: "Плотный шот, горький шоколад и сухой орех", meta: "30 мл", isNew: false },
  { id: 3, nazvanie: 'Фильтр "Обводный"', cena: 260, image: "assets/menu-filter.jpg", opis: "Спокойная чашка для длинного разговора", meta: "250 мл", isNew: true },
  { id: 4, nazvanie: 'Какао "Кирпич"', cena: 240, image: "assets/menu-cacao.jpg", opis: "Густое какао на молоке, без лишней сладости", meta: "280 мл", isNew: false },
  { id: 5, nazvanie: "Круассан с солью", cena: 210, image: "assets/menu-croissant.jpg", opis: "Хрустящее тесто и сливочное послевкусие", meta: "95 г", isNew: false },
  { id: 6, nazvanie: "Шу с облепихой", cena: 230, image: "assets/menu-choux.jpg", opis: "Заварное тесто и яркий кислый крем", meta: "120 г", isNew: true }
];

const MENU_IMAGES_BY_NAME = {
  'Раф "Циолковский"': "assets/menu-raf.jpg",
  'Эспрессо "Смена"': "assets/menu-espresso.jpg",
  'Фильтр "Обводный"': "assets/menu-filter.jpg",
  'Какао "Кирпич"': "assets/menu-cacao.jpg",
  "Круассан с солью": "assets/menu-croissant.jpg",
  "Шу с облепихой": "assets/menu-choux.jpg"
};

let menuCache = null;

function normalizeMenuList(items) {
  return items.map((item) => {
    const forcedImage = MENU_IMAGES_BY_NAME[item.nazvanie];
    return {
      ...item,
      image: forcedImage || item.image || "assets/coffee-1.svg",
      meta: item.meta || "порция",
      opis: item.opis || "Авторская позиция",
      isNew: Boolean(item.isNew)
    };
  });
}

async function fetchMenuItems() {
  const res = await fetch("/api/menu", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Не удалось загрузить меню");
  const data = await res.json();
  menuCache = normalizeMenuList(Array.isArray(data.items) ? data.items : []);
  window.dispatchEvent(new CustomEvent("volna-menu-updated"));
  return menuCache;
}

function loadMenuItems() {
  return menuCache ? [...menuCache] : normalizeMenuList(DEFAULT_MENU);
}

function getMenuItemLabel(item) {
  const weight = item.meta ? `, ${item.meta}` : "";
  return `${item.nazvanie}${weight}`;
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка API");
  return data;
}

async function createMenuItem(payload) {
  const data = await apiJson("/api/admin/menu", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  await fetchMenuItems();
  return data.item;
}

async function updateMenuItem(id, payload) {
  const data = await apiJson(`/api/admin/menu/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  await fetchMenuItems();
  return data.item;
}

async function deleteMenuItem(id) {
  await apiJson(`/api/admin/menu/${id}`, { method: "DELETE" });
  await fetchMenuItems();
}

async function fetchNewsItems() {
  const res = await fetch("/api/news", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Не удалось загрузить новости");
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

async function createNewsItem(payload) {
  const data = await apiJson("/api/admin/news", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return data.item;
}

async function updateNewsItem(id, payload) {
  const data = await apiJson(`/api/admin/news/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  return data.item;
}

async function deleteNewsItem(id) {
  await apiJson(`/api/admin/news/${id}`, { method: "DELETE" });
}

async function fetchAdminOrders() {
  const data = await apiJson("/api/admin/orders");
  return Array.isArray(data.items) ? data.items : [];
}

async function createOrder(payload) {
  return apiJson("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
