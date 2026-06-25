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
let adminSection, adminPanel, adminForm, newsForm, ordersList;
let adminMenuCount, adminOrdersToday, adminMenuList, newsGrid, adminNewsList;

let napitki = [];
let novosti = [];
let zakazy = [];

async function initApp() {
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
  adminSection = document.getElementById("admin");
  adminPanel = document.getElementById("adminPanel");
  adminForm = document.getElementById("adminForm");
  newsForm = document.getElementById("newsForm");
  ordersList = document.getElementById("ordersList");
  adminMenuCount = document.getElementById("adminMenuCount");
  adminOrdersToday = document.getElementById("adminOrdersToday");
  adminMenuList = document.getElementById("adminMenuList");
  newsGrid = document.getElementById("newsGrid");
  adminNewsList = document.getElementById("adminNewsList");

  otrisovkaFrazy();
  initSiteHeader({ activePage: "home" });
  setupAdminAccess();

  if (!newsGrid) {
    showFatal("JS упал: не нашёл блок новостей в HTML");
    return;
  }

  try {
    napitki = await fetchMenuItems();
    novosti = await fetchNewsItems();
  } catch (e) {
    showFatal(`Не удалось загрузить данные с сервера: ${e.message}`);
    napitki = loadMenuItems();
    novosti = [];
  }

  if (menuGrid) {
    menuGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-btn");
      if (!btn) return;
      addToKorzina(btn.dataset.name, btn.dataset.price);
    });
  }

  initCartUI();

  if (adminForm) adminForm.addEventListener("submit", dobavitNapitok);
  if (newsForm) newsForm.addEventListener("submit", dobavitNovost);

  if (menuGrid) renderMenu();
  renderNews();
  await refreshOrders();
  renderAdminMenu();
  renderAdminNews();
  updateAdminStats();

  window.addEventListener("volna-menu-updated", () => {
    napitki = loadMenuItems();
    if (menuGrid) renderMenu();
    renderAdminMenu();
    updateAdminStats();
  });

  window.addEventListener("volna-orders-updated", refreshOrders);
}

document.addEventListener("DOMContentLoaded", () => {
  initApp().catch((e) => {
    showFatal(`JS упал: ${e && e.message ? e.message : String(e)}`);
  });
});

async function refreshOrders() {
  try {
    const me = await fetchMe();
    if (me.user && me.user.isAdmin) {
      zakazy = await fetchAdminOrders();
    } else {
      zakazy = [];
    }
  } catch {
    zakazy = [];
  }
  renderOrders();
  updateAdminStats();
}

function renderMenu() {
  if (!menuGrid) return;
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
  if (!adminNewsList) return;
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
  if (!adminMenuList) return;
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

function renderOrders() {
  if (!ordersList) return;
  ordersList.innerHTML = "";
  const slice = zakazy.slice(0, 7);
  if (!slice.length) {
    ordersList.innerHTML = "<li>Пока заказов нет</li>";
    return;
  }
  for (const z of slice) {
    const li = document.createElement("li");
    li.textContent = `${z.data} — ${z.client || "Гость"} (${z.phone || "-"}) — ${z.itemsSummary || "заказ"} — ${z.total} ₽`;
    ordersList.appendChild(li);
  }
}

function setupAdminAccess() {
  if (typeof fetchMe !== "function") return;
  fetchMe()
    .then(({ user }) => {
      if (user && user.isAdmin && adminSection) {
        adminSection.classList.remove("hidden");
      } else if (adminSection) {
        adminSection.classList.add("hidden");
      }
    })
    .catch(() => {
      if (adminSection) adminSection.classList.add("hidden");
    });
}

async function dobavitNapitok(e) {
  e.preventDefault();
  const title = document.getElementById("newTitle").value.trim();
  const price = Number(document.getElementById("newPrice").value);
  const image = document.getElementById("newImage").value.trim() || "assets/coffee-1.svg";
  if (!title || !price) return;

  try {
    await createMenuItem({
      nazvanie: title,
      cena: price,
      image,
      opis: "Новая позиция от бариста",
      meta: "порция"
    });
    napitki = loadMenuItems();
    if (menuGrid) renderMenu();
    renderAdminMenu();
    updateAdminStats();
    adminForm.reset();
  } catch (err) {
    alert(err.message || "Не удалось добавить позицию");
  }
}

async function dobavitNovost(e) {
  e.preventDefault();
  const title = document.getElementById("newsTitle").value.trim();
  const date = document.getElementById("newsDate").value.trim();
  const text = document.getElementById("newsText").value.trim();
  if (!title || !date || !text) return;

  try {
    const item = await createNewsItem({ title, date, text });
    novosti.unshift(item);
    renderNews();
    renderAdminNews();
    newsForm.reset();
  } catch (err) {
    alert(err.message || "Не удалось добавить новость");
  }
}

async function pravkaNovost(id) {
  const idx = novosti.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const newTitle = prompt("Новый заголовок", novosti[idx].title);
  if (!newTitle) return;
  const newDate = prompt("Новая дата", novosti[idx].date);
  if (!newDate) return;
  const newText = prompt("Новый текст", novosti[idx].text);
  if (!newText) return;

  try {
    const item = await updateNewsItem(id, {
      title: newTitle.trim(),
      date: newDate.trim(),
      text: newText.trim()
    });
    novosti[idx] = item;
    renderNews();
    renderAdminNews();
  } catch (err) {
    alert(err.message || "Не удалось обновить новость");
  }
}

async function pravkaNapitka(id) {
  const idx = napitki.findIndex((x) => x.id === id);
  if (idx === -1) return;
  const item = napitki[idx];
  const newTitle = prompt("Новое название", item.nazvanie);
  if (newTitle === null) return;
  const newPriceRaw = prompt("Новая цена", item.cena);
  if (newPriceRaw === null) return;
  const newPrice = Number(newPriceRaw);
  if (!newTitle.trim() || Number.isNaN(newPrice) || newPrice < 0) {
    alert("Укажите название и корректную цену");
    return;
  }
  const newOpis = prompt("Описание", item.opis || "");
  if (newOpis === null) return;
  const newMeta = prompt("Порция / объём (например 300 мл)", item.meta || "");
  if (newMeta === null) return;

  try {
    await updateMenuItem(id, {
      nazvanie: newTitle.trim(),
      cena: newPrice,
      opis: newOpis.trim() || item.opis,
      meta: newMeta.trim() || item.meta,
      image: item.image,
      isNew: item.isNew
    });
    napitki = loadMenuItems();
    if (menuGrid) renderMenu();
    renderAdminMenu();
    updateAdminStats();
  } catch (err) {
    alert(err.message || "Не удалось обновить позицию");
  }
}

async function udalitNapitok(id) {
  try {
    await deleteMenuItem(id);
    napitki = loadMenuItems();
    if (menuGrid) renderMenu();
    renderAdminMenu();
    updateAdminStats();
  } catch (err) {
    alert(err.message || "Не удалось удалить позицию");
  }
}

async function udalitNovost(id) {
  try {
    await deleteNewsItem(id);
    novosti = novosti.filter((x) => x.id !== id);
    renderNews();
    renderAdminNews();
  } catch (err) {
    alert(err.message || "Не удалось удалить новость");
  }
}

function updateAdminStats() {
  if (adminMenuCount) adminMenuCount.textContent = napitki.length;
  if (!adminOrdersToday) return;
  const segodnya = new Date().toLocaleDateString("ru-RU");
  const count = zakazy.filter((item) => String(item.data).includes(segodnya)).length;
  adminOrdersToday.textContent = count;
}

function otrisovkaFrazy() {
  const phrases = [
    "Кофе — это язык, на котором говорит утро.",
    "Сначала глоток, потом разговор.",
    "На волне даже тишина пахнет зерном.",
    "Горько, крепко, по-питерски."
  ];

  let randomIndex = Math.floor(Math.random() * phrases.length);
  const phraseEl = document.getElementById("dayPhrase");
  if (phraseEl) phraseEl.textContent = phrases[randomIndex];
}
