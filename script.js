function showFatal(text) {
  const old = document.getElementById("fatalBox");
  if (old) old.remove();
  const box = document.createElement("div");
  box.id = "fatalBox";
  box.style.position = "fixed";
  box.style.left = "12px";
  box.style.right = "12px";
  box.style.bottom = "12px";
  box.style.zIndex = "9999";
  box.style.background = "#2a1515";
  box.style.border = "1px solid #c0693a";
  box.style.color = "#efe5dd";
  box.style.padding = "10px 12px";
  box.style.fontFamily = "PT Sans, Arial, sans-serif";
  box.style.whiteSpace = "pre-wrap";
  box.textContent = text;
  document.body.appendChild(box);
}

window.addEventListener("error", (e) => {
  showFatal(`JS упал: ${e.message}\n${e.filename}:${e.lineno}`);
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
  showFatal(`JS упал: ${msg}`);
});

let cartKnopka, modalka, closeKnopka, cartList, totalPrice, cartCount, clearCart;
let logoKnopka, menuGrid, checkoutBtn, orderName, orderPhone;
let adminPin, adminEnter, adminPanel, adminForm, newsForm, ordersList;
let adminMenuCount, adminOrdersToday, adminMenuList, newsGrid, adminNewsList, adminLogin;

const defaultMenu = [
  { id: 1, nazvanie: 'Раф "Циолковский"', cena: 320, image: "assets/раф.jpg", opis: "Сливочный раф с мягкой ванильной нотой", meta: "300 мл · молочный" },
  { id: 2, nazvanie: 'Эспрессо "Смена"', cena: 180, image: "assets/Экс.jpg", opis: "Плотный шот, горький шоколад и сухой орех", meta: "30 мл · классика" },
  { id: 3, nazvanie: 'Фильтр "Обводный"', cena: 260, image: "assets/америк.jpg", opis: "Спокойная чашка для длинного разговора", meta: "250 мл · зерно дня" },
  { id: 4, nazvanie: 'Какао "Кирпич"', cena: 240, image: "assets/какао.jpg", opis: "Густое какао на молоке, без лишней сладости", meta: "280 мл · без кофеина" },
  { id: 5, nazvanie: "Круассан с солью", cena: 210, image: "assets/круас.jpg", opis: "Хрустящее тесто и сливочное послевкусие", meta: "утренняя выпечка" },
  { id: 6, nazvanie: "Шу с облепихой", cena: 230, image: "assets/шу.jpg", opis: "Заварное тесто и яркий кислый крем", meta: "десерт дня" }
];

const defaultNews = [
  { id: 1, title: "Новая партия из Минас-Жерайс", date: "27 мая", text: "Привезли свежую Бразилию под фильтр. Вкус: какао, орех, сухофрукты. Будет в меню до конца недели." },
  { id: 2, title: "Обновили вечерний спешл", date: "25 мая", text: "После 19:00 делаем сет: эспрессо + мини-шу по фиксированной цене. Хотели сделать просто по-соседски." }
];

function loadNonEmptyArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function loadArray(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

let napitki = loadNonEmptyArray("menu-obvodny", defaultMenu);
let korzina = loadArray("korzina-obvodny", []);
const zakazy = loadArray("zakazy-obvodny", []);
let novosti = loadNonEmptyArray("news-obvodny", defaultNews);

const menuImagesByName = {
  'Раф "Циолковский"': "assets/раф.jpg",
  'Эспрессо "Смена"': "assets/Экс.jpg",
  'Фильтр "Обводный"': "assets/америк.jpg",
  'Какао "Кирпич"': "assets/какао.jpg",
  "Круассан с солью": "assets/круас.jpg",
  "Шу с облепихой": "assets/шу.jpg"
};

napitki = napitki.map((item) => {
  const forcedImage = menuImagesByName[item.nazvanie];
  return forcedImage ? { ...item, image: forcedImage } : item;
});
saveMenu();

function initApp() {
  cartKnopka = document.getElementById("cartToggle");
  modalka = document.getElementById("cartModal");
  closeKnopka = document.getElementById("closeCart");
  cartList = document.getElementById("cartList");
  totalPrice = document.getElementById("totalPrice");
  cartCount = document.getElementById("cartCount");
  clearCart = document.getElementById("clearCart");
  logoKnopka = document.getElementById("logoKnopka");
  menuGrid = document.getElementById("menuGrid");
  checkoutBtn = document.getElementById("checkoutBtn");
  orderName = document.getElementById("orderName");
  orderPhone = document.getElementById("orderPhone");
  adminPin = document.getElementById("adminPin");
  adminEnter = document.getElementById("adminEnter");
  adminPanel = document.getElementById("adminPanel");
  adminForm = document.getElementById("adminForm");
  newsForm = document.getElementById("newsForm");
  ordersList = document.getElementById("ordersList");
  adminMenuCount = document.getElementById("adminMenuCount");
  adminOrdersToday = document.getElementById("adminOrdersToday");
  adminMenuList = document.getElementById("adminMenuList");
  newsGrid = document.getElementById("newsGrid");
  adminNewsList = document.getElementById("adminNewsList");
  adminLogin = document.getElementById("adminLogin");

  otrisovkaFrazy();

  if (!menuGrid || !newsGrid) {
    showFatal("JS упал: не нашёл блоки меню/новостей в HTML");
    return;
  }

  menuGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (!btn) return;
    const nazvanie = btn.dataset.name;
    let cena = Number(btn.dataset.price);
    korzina.push({ nazvanie, cena });
    saveKorzina();
    renderKorzina();
  });

  if (cartKnopka) cartKnopka.addEventListener("click", toggleCart);
  if (closeKnopka) closeKnopka.addEventListener("click", toggleCart);
  if (checkoutBtn) checkoutBtn.addEventListener("click", sdelatZakaz);

  if (modalka) {
    modalka.addEventListener("click", function (e) {
      if (e.target === modalka) toggleCart();
    });
  }

  if (clearCart) {
    clearCart.addEventListener("click", () => {
      korzina = [];
      saveKorzina();
      renderKorzina();
    });
  }

  if (logoKnopka) {
    logoKnopka.addEventListener("click", function () {
      alert("Я сижу у окна. Я помыл посуду. Я был счастлив здесь, и уже не буду. — И. Бродский");
    });
  }

  if (adminEnter) adminEnter.addEventListener("click", otkrytAdmin);
  if (adminPin) {
    adminPin.addEventListener("keydown", (e) => {
      if (e.key === "Enter") otkrytAdmin();
    });
  }
  if (adminForm) adminForm.addEventListener("submit", dobavitNapitok);
  if (newsForm) newsForm.addEventListener("submit", dobavitNovost);

  if (sessionStorage.getItem("admin-ok") === "1") {
    if (adminPanel) adminPanel.classList.remove("hidden");
    if (adminLogin) adminLogin.classList.add("hidden");
  }

  renderMenu();
  renderNews();
  renderKorzina();
  renderOrders();
  renderAdminMenu();
  renderAdminNews();
  updateAdminStats();
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    initApp();
  } catch (e) {
    showFatal(`JS упал: ${e && e.message ? e.message : String(e)}`);
  }
});

function toggleCart() {
  modalka.classList.toggle("hidden");
}

const saveKorzina = () => {
  localStorage.setItem("korzina-obvodny", JSON.stringify(korzina));
};

function saveMenu() {
  localStorage.setItem("menu-obvodny", JSON.stringify(napitki));
}

function saveOrders() {
  localStorage.setItem("zakazy-obvodny", JSON.stringify(zakazy));
}

function saveNews() {
  localStorage.setItem("news-obvodny", JSON.stringify(novosti));
}

function renderMenu() {
  menuGrid.innerHTML = "";
  napitki.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    const img = document.createElement("img");
    const h3 = document.createElement("h3");
    const opis = document.createElement("p");
    const meta = document.createElement("p");
    const price = document.createElement("p");
    const btn = document.createElement("button");

    img.src = item.image;
    img.alt = item.nazvanie;
    img.addEventListener("error", () => {
      img.src = "assets/coffee-1.svg";
    });
    h3.textContent = item.nazvanie;
    opis.className = "opis";
    opis.textContent = item.opis || "Авторская позиция из нашего бара";
    meta.className = "meta";
    meta.textContent = item.meta || "порция стандарт";
    price.className = "price";
    price.textContent = `${item.cena} ₽`;
    btn.className = "add-btn";
    btn.textContent = "В корзину";
    btn.dataset.name = item.nazvanie;
    btn.dataset.price = item.cena;

    card.append(img, h3, opis, meta, price, btn);
    menuGrid.appendChild(card);
  });
}

function renderNews() {
  newsGrid.innerHTML = "";
  novosti.forEach((item) => {
    const card = document.createElement("article");
    card.className = "news-card";
    card.innerHTML = `
      <h3>${item.title}</h3>
      <p class="news-date">${item.date}</p>
      <p>${item.text}</p>
    `;
    newsGrid.appendChild(card);
  });
}

function renderAdminNews() {
  adminNewsList.innerHTML = "";
  if (!novosti.length) {
    adminNewsList.innerHTML = "<li>Пусто</li>";
    return;
  }
  novosti.forEach((item) => {
    const li = document.createElement("li");
    const txt = document.createElement("span");
    const actions = document.createElement("div");
    const editBtn = document.createElement("button");
    const delBtn = document.createElement("button");
    txt.textContent = `${item.date} — ${item.title}`;
    actions.className = "admin-menu-actions";
    editBtn.className = "mini-btn";
    delBtn.className = "mini-del";
    editBtn.textContent = "править";
    delBtn.textContent = "удалить";
    editBtn.addEventListener("click", () => pravkaNovost(item.id));
    delBtn.addEventListener("click", () => udalitNovost(item.id));
    actions.append(editBtn, delBtn);
    li.append(txt, actions);
    adminNewsList.appendChild(li);
  });
}

function renderAdminMenu() {
  adminMenuList.innerHTML = "";
  if (!napitki.length) {
    adminMenuList.innerHTML = "<li>Пусто</li>";
    return;
  }
  napitki.forEach((item) => {
    const li = document.createElement("li");
    const txt = document.createElement("span");
    const actions = document.createElement("div");
    const editBtn = document.createElement("button");
    const delBtn = document.createElement("button");
    txt.textContent = `${item.nazvanie} — ${item.cena} ₽`;
    actions.className = "admin-menu-actions";
    editBtn.className = "mini-btn";
    delBtn.className = "mini-del";
    editBtn.textContent = "править";
    delBtn.textContent = "удалить";
    editBtn.addEventListener("click", () => pravkaNapitka(item.id));
    delBtn.addEventListener("click", () => udalitNapitok(item.id));
    actions.append(editBtn, delBtn);
    li.append(txt, actions);
    adminMenuList.appendChild(li);
  });
}

function renderKorzina() {
  cartList.innerHTML = "";
  let summa = 0;

  if (korzina.length === 0) {
    cartList.innerHTML = "<li>Пока пусто, но это поправимо.</li>";
  } else {
    korzina.forEach((napitok, idx) => {
      summa += napitok.cena;
      const li = document.createElement("li");
      const txt = document.createElement("span");
      const deleteBtn = document.createElement("button");
      txt.textContent = napitok.nazvanie + " — " + napitok.cena + " ₽";
      deleteBtn.textContent = "убрать";
      deleteBtn.className = "mini-del";
      deleteBtn.addEventListener("click", () => {
        korzina.splice(idx, 1);
        saveKorzina();
        renderKorzina();
      });
      li.append(txt, deleteBtn);
      cartList.appendChild(li);
    });
  }

  totalPrice.textContent = `${summa} ₽`;
  cartCount.textContent = korzina.length;
}

function sdelatZakaz() {
  if (!korzina.length) {
    alert("Корзина пустая");
    return;
  }
  const fio = orderName.value.trim();
  const tel = orderPhone.value.trim();
  if (!fio || !tel) {
    alert("Заполни имя и телефон");
    return;
  }
  const itog = korzina.reduce((acc, item) => acc + item.cena, 0);
  let order = {
    id: Date.now(),
    data: new Date().toLocaleString("ru-RU"),
    client: fio,
    phone: tel,
    items: [...korzina],
    total: itog,
    status: "new"
  };
  zakazy.unshift(order);
  saveOrders();
  korzina = [];
  saveKorzina();
  orderName.value = "";
  orderPhone.value = "";
  renderKorzina();
  renderOrders();
  updateAdminStats();
  toggleCart();
  alert(`Заказ принят, ${fio}`);
}

function renderOrders() {
  ordersList.innerHTML = "";
  const slice = zakazy.slice(0, 7);
  if (!slice.length) {
    ordersList.innerHTML = "<li>Пока заказов нет</li>";
    return;
  }
  for (const z of slice) {
    const li = document.createElement("li");
    li.textContent = `${z.data} — ${z.client || "Гость"} (${z.phone || "-"}) — ${z.items.length} поз. — ${z.total} ₽`;
    ordersList.appendChild(li);
  }
}

const otkrytAdmin = () => {
  if (adminPin.value.trim() === "2402") {
    adminPanel.classList.remove("hidden");
    adminPin.value = "";
    sessionStorage.setItem("admin-ok", "1");
    if (adminLogin) adminLogin.classList.add("hidden");
    return;
  }
  alert("Неверный пин");
};

function dobavitNapitok(e) {
  e.preventDefault();
  const title = document.getElementById("newTitle").value.trim();
  let price = Number(document.getElementById("newPrice").value);
  const image = document.getElementById("newImage").value.trim() || "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80";
  if (!title || !price) {
    return;
  }
  napitki.push({ id: Date.now(), nazvanie: title, cena: price, image, opis: "Новая позиция от бариста", meta: "ручное обновление" });
  saveMenu();
  renderMenu();
  renderAdminMenu();
  updateAdminStats();
  adminForm.reset();
}

function dobavitNovost(e) {
  e.preventDefault();
  const title = document.getElementById("newsTitle").value.trim();
  const date = document.getElementById("newsDate").value.trim();
  const text = document.getElementById("newsText").value.trim();
  if (!title || !date || !text) return;
  novosti.unshift({ id: Date.now(), title, date, text });
  saveNews();
  renderNews();
  renderAdminNews();
  newsForm.reset();
}

function pravkaNovost(id) {
  const idx = novosti.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const newTitle = prompt("Новый заголовок", novosti[idx].title);
  if (!newTitle) return;
  const newDate = prompt("Новая дата", novosti[idx].date);
  if (!newDate) return;
  const newText = prompt("Новый текст", novosti[idx].text);
  if (!newText) return;
  novosti[idx].title = newTitle.trim();
  novosti[idx].date = newDate.trim();
  novosti[idx].text = newText.trim();
  saveNews();
  renderNews();
  renderAdminNews();
}

function pravkaNapitka(id) {
  const idx = napitki.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const newTitle = prompt("Новое название", napitki[idx].nazvanie);
  if (!newTitle) return;
  const newPrice = Number(prompt("Новая цена", napitki[idx].cena));
  if (!newPrice) return;
  napitki[idx].nazvanie = newTitle.trim();
  napitki[idx].cena = newPrice;
  saveMenu();
  renderMenu();
  renderAdminMenu();
}

const udalitNapitok = (id) => {
  napitki = napitki.filter((x) => x.id !== id);
  saveMenu();
  renderMenu();
  renderAdminMenu();
  updateAdminStats();
};

function udalitNovost(id) {
  novosti = novosti.filter((x) => x.id !== id);
  saveNews();
  renderNews();
  renderAdminNews();
}

function updateAdminStats() {
  adminMenuCount.textContent = napitki.length;
  const segodnya = new Date().toLocaleDateString("ru-RU");
  const count = zakazy.filter((item) => item.data.includes(segodnya)).length;
  adminOrdersToday.textContent = count;
}

function otrisovkaFrazy() {
  const phrases = [
    "Кофе — это язык, на котором говорит утро.",
    "Сначала глоток, потом разговор.",
    "На Обводном даже тишина пахнет зерном.",
    "Горько, крепко, по-питерски."
  ];

  let randomIndex = Math.floor(Math.random() * phrases.length);
  const phraseEl = document.getElementById("dayPhrase");
  if (phraseEl) phraseEl.textContent = phrases[randomIndex];
}
