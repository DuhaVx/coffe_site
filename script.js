otrisovkaFrazy();

const cartKnopka = document.getElementById("cartToggle");
const modalka = document.getElementById("cartModal");
let closeKnopka = document.getElementById("closeCart");
const cartList = document.getElementById("cartList");
let totalPrice = document.getElementById("totalPrice");
const cartCount = document.getElementById("cartCount");
const clearCart = document.getElementById("clearCart");
let logoKnopka = document.getElementById("logoKnopka");
const menuGrid = document.getElementById("menuGrid");
const checkoutBtn = document.getElementById("checkoutBtn");
const orderName = document.getElementById("orderName");
const orderPhone = document.getElementById("orderPhone");
const adminPin = document.getElementById("adminPin");
const adminEnter = document.getElementById("adminEnter");
const adminPanel = document.getElementById("adminPanel");
const adminForm = document.getElementById("adminForm");
const newsForm = document.getElementById("newsForm");
const ordersList = document.getElementById("ordersList");
const adminMenuCount = document.getElementById("adminMenuCount");
const adminOrdersToday = document.getElementById("adminOrdersToday");
const adminMenuList = document.getElementById("adminMenuList");
const newsGrid = document.getElementById("newsGrid");
const adminNewsList = document.getElementById("adminNewsList");

const defaultMenu = [
  { id: 1, nazvanie: 'Раф "Циолковский"', cena: 320, image: "assets/coffee-1.svg", opis: "Сливочный раф с мягкой ванильной нотой", meta: "300 мл · молочный" },
  { id: 2, nazvanie: 'Эспрессо "Смена"', cena: 180, image: "assets/coffee-2.svg", opis: "Плотный шот, горький шоколад и сухой орех", meta: "30 мл · классика" },
  { id: 3, nazvanie: 'Фильтр "Обводный"', cena: 260, image: "assets/coffee-3.svg", opis: "Спокойная чашка для длинного разговора", meta: "250 мл · зерно дня" },
  { id: 4, nazvanie: 'Какао "Кирпич"', cena: 240, image: "assets/coffee-4.svg", opis: "Густое какао на молоке, без лишней сладости", meta: "280 мл · без кофеина" },
  { id: 5, nazvanie: "Круассан с солью", cena: 210, image: "assets/coffee-5.svg", opis: "Хрустящее тесто и сливочное послевкусие", meta: "утренняя выпечка" },
  { id: 6, nazvanie: "Шу с облепихой", cena: 230, image: "assets/coffee-6.svg", opis: "Заварное тесто и яркий кислый крем", meta: "десерт дня" }
];

const defaultNews = [
  { id: 1, title: "Новая партия из Минас-Жерайс", date: "27 мая", text: "Привезли свежую Бразилию под фильтр. Вкус: какао, орех, сухофрукты. Будет в меню до конца недели." },
  { id: 2, title: "Обновили вечерний спешл", date: "25 мая", text: "После 19:00 делаем сет: эспрессо + мини-шу по фиксированной цене. Хотели сделать просто по-соседски." }
];

let napitki = JSON.parse(localStorage.getItem("menu-obvodny")) || defaultMenu;
let korzina = JSON.parse(localStorage.getItem("korzina-obvodny")) || [];
const zakazy = JSON.parse(localStorage.getItem("zakazy-obvodny")) || [];
let novosti = JSON.parse(localStorage.getItem("news-obvodny")) || defaultNews;

menuGrid.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-btn");
  if (!btn) return;
  const nazvanie = btn.dataset.name;
  let cena = Number(btn.dataset.price);
  korzina.push({ nazvanie, cena });
  saveKorzina();
  renderKorzina();
});

cartKnopka.addEventListener("click", toggleCart);
closeKnopka.addEventListener("click", toggleCart);
checkoutBtn.addEventListener("click", sdelatZakaz);

modalka.addEventListener("click", function (e) {
  if (e.target === modalka) {
    toggleCart();
  }
});

clearCart.addEventListener("click", () => {
  korzina = [];
  saveKorzina();
  renderKorzina();
});

logoKnopka.addEventListener("click", function () {
  alert("Я сижу у окна. Я помыл посуду. Я был счастлив здесь, и уже не буду. — И. Бродский");
});

adminEnter.addEventListener("click", otkrytAdmin);
adminForm.addEventListener("submit", dobavitNapitok);
newsForm.addEventListener("submit", dobavitNovost);

renderMenu();
renderNews();
renderKorzina();
renderOrders();
renderAdminMenu();
renderAdminNews();
updateAdminStats();

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
  phraseEl.textContent = phrases[randomIndex];
}
