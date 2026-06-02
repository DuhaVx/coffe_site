function renderMenuCatalog() {
  const grid = document.getElementById("menuCatalog");
  if (!grid) return;

  const items = loadMenuItems();
  grid.innerHTML = "";

  items.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "menu-card";
    if (index < 2) card.classList.add("menu-card--wide");

    const media = document.createElement("div");
    media.className = "menu-card-media";

    const img = document.createElement("img");
    img.src = item.image;
    img.alt = item.nazvanie;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.src = "assets/coffee-1.svg";
    });

    if (item.isNew) {
      const badge = document.createElement("span");
      badge.className = "menu-card-badge";
      badge.textContent = "New";
      media.appendChild(badge);
    }

    media.appendChild(img);

    const footer = document.createElement("div");
    footer.className = "menu-card-footer";

    const buyRow = document.createElement("div");
    buyRow.className = "menu-card-buy";

    const price = document.createElement("span");
    price.className = "menu-card-price";
    price.textContent = `${item.cena} ₽`;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "menu-card-add";
    addBtn.setAttribute("aria-label", `Добавить ${item.nazvanie}`);
    addBtn.textContent = "+";
    addBtn.addEventListener("click", () => {
      addToKorzina(item.nazvanie, item.cena);
    });

    buyRow.append(price, addBtn);

    const title = document.createElement("p");
    title.className = "menu-card-title";
    title.textContent = getMenuItemLabel(item);

    footer.append(buyRow, title);
    card.append(media, footer);
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSiteHeader();
  initCartUI();
  renderMenuCatalog();

  window.addEventListener("storage", (e) => {
    if (e.key === MENU_STORAGE_KEY) renderMenuCatalog();
  });

  window.addEventListener("volna-menu-updated", renderMenuCatalog);
  window.addEventListener("pageshow", renderMenuCatalog);
});
