const MENU_STORAGE_KEY = "menu-obvodny";

const DEFAULT_MENU = [
  { id: 1, nazvanie: 'Раф "Циолковский"', cena: 320, image: "assets/раф.jpg", opis: "Сливочный раф с мягкой ванильной нотой", meta: "300 мл", isNew: false },
  { id: 2, nazvanie: 'Эспрессо "Смена"', cena: 180, image: "assets/Экс.jpg", opis: "Плотный шот, горький шоколад и сухой орех", meta: "30 мл", isNew: false },
  { id: 3, nazvanie: 'Фильтр "Обводный"', cena: 260, image: "assets/америк.jpg", opis: "Спокойная чашка для длинного разговора", meta: "250 мл", isNew: true },
  { id: 4, nazvanie: 'Какао "Кирпич"', cena: 240, image: "assets/какао.jpg", opis: "Густое какао на молоке, без лишней сладости", meta: "280 мл", isNew: false },
  { id: 5, nazvanie: "Круассан с солью", cena: 210, image: "assets/круас.jpg", opis: "Хрустящее тесто и сливочное послевкусие", meta: "95 г", isNew: false },
  { id: 6, nazvanie: "Шу с облепихой", cena: 230, image: "assets/шу.jpg", opis: "Заварное тесто и яркий кислый крем", meta: "120 г", isNew: true }
];

const MENU_IMAGES_BY_NAME = {
  'Раф "Циолковский"': "assets/раф.jpg",
  'Эспрессо "Смена"': "assets/Экс.jpg",
  'Фильтр "Обводный"': "assets/америк.jpg",
  'Какао "Кирпич"': "assets/какао.jpg",
  "Круассан с солью": "assets/круас.jpg",
  "Шу с облепихой": "assets/шу.jpg"
};

function loadMenuItems() {
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (!raw) return normalizeMenuList(DEFAULT_MENU);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return normalizeMenuList(DEFAULT_MENU);
    return normalizeMenuList(parsed);
  } catch {
    return normalizeMenuList(DEFAULT_MENU);
  }
}

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

function saveMenuItems(items) {
  localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("volna-menu-updated"));
}

function getMenuItemLabel(item) {
  const weight = item.meta ? `, ${item.meta}` : "";
  return `${item.nazvanie}${weight}`;
}
