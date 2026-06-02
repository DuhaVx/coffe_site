let korzina = [];

function loadKorzina() {
  try {
    const raw = localStorage.getItem("korzina-obvodny");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveKorzina() {
  localStorage.setItem("korzina-obvodny", JSON.stringify(korzina));
}

function addToKorzina(nazvanie, cena) {
  korzina.push({ nazvanie, cena: Number(cena) });
  saveKorzina();
  renderKorzina();
}

function initCartUI() {
  korzina = loadKorzina();

  const cartToggle = document.getElementById("cartToggle");
  const modalka = document.getElementById("cartModal");
  const closeKnopka = document.getElementById("closeCart");
  const clearCart = document.getElementById("clearCart");
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (cartToggle) cartToggle.addEventListener("click", toggleCart);
  if (closeKnopka) closeKnopka.addEventListener("click", toggleCart);
  if (modalka) {
    modalka.addEventListener("click", (e) => {
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
  if (checkoutBtn) checkoutBtn.addEventListener("click", sdelatZakaz);

  renderKorzina();
}

function toggleCart() {
  const modalka = document.getElementById("cartModal");
  if (modalka) modalka.classList.toggle("hidden");
}

function renderKorzina() {
  const cartList = document.getElementById("cartList");
  const totalPrice = document.getElementById("totalPrice");
  const cartCount = document.getElementById("cartCount");
  if (!cartList || !totalPrice || !cartCount) return;

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
      txt.textContent = `${napitok.nazvanie} — ${napitok.cena} ₽`;
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
  const orderName = document.getElementById("orderName");
  const orderPhone = document.getElementById("orderPhone");
  const fio = orderName?.value.trim() || "";
  const tel = orderPhone?.value.trim() || "";
  if (!fio || !tel) {
    alert("Заполни имя и телефон");
    return;
  }

  let zakazy = [];
  try {
    const raw = localStorage.getItem("zakazy-obvodny");
    zakazy = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(zakazy)) zakazy = [];
  } catch {
    zakazy = [];
  }

  const itog = korzina.reduce((acc, item) => acc + item.cena, 0);
  zakazy.unshift({
    id: Date.now(),
    data: new Date().toLocaleString("ru-RU"),
    client: fio,
    phone: tel,
    items: [...korzina],
    total: itog,
    status: "new"
  });
  localStorage.setItem("zakazy-obvodny", JSON.stringify(zakazy));

  korzina = [];
  saveKorzina();
  if (orderName) orderName.value = "";
  if (orderPhone) orderPhone.value = "";
  renderKorzina();
  toggleCart();
  alert(`Заказ принят, ${fio}`);
}
