const FIELD_LABELS = {
  login: "Логин",
  password: "Пароль",
  firstName: "Имя",
  lastName: "Фамилия",
  middleName: "Отчество",
  phone: "Телефон",
  email: "Эл. почта"
};

const FIELD_PLACEHOLDERS = {
  login: "Новый логин",
  password: "Новый пароль",
  firstName: "Имя",
  lastName: "Фамилия",
  middleName: "Отчество",
  phone: "+7 (___) ___-__-__",
  email: "name@example.com"
};

let currentUser = null;

function displayName(user) {
  const parts = [user.lastName, user.firstName, user.middleName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.login;
}

function maskPassword() {
  return "••••••••";
}

function formatValue(field, user) {
  if (field === "password") return maskPassword();
  const val = user[field];
  return val && String(val).trim() ? val : "Не указано";
}

function openEditModal(field, currentValue) {
  const modal = document.getElementById("editModal");
  const title = document.getElementById("editModalTitle");
  const input = document.getElementById("editModalInput");
  const msg = document.getElementById("editModalMsg");
  if (!modal || !input) return;

  title.textContent = `Изменить: ${FIELD_LABELS[field]}`;
  input.type = field === "password" ? "password" : "text";
  input.value = field === "password" ? "" : currentValue === "Не указано" ? "" : currentValue;
  input.placeholder = FIELD_PLACEHOLDERS[field] || "";
  msg.textContent = "";
  modal.dataset.field = field;
  modal.classList.remove("hidden");
  input.focus();
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (modal) modal.classList.add("hidden");
}

async function parseApiResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    if (res.status === 404) {
      throw new Error("Сервер не отвечает. Запустите сайт через npm start (не Live Server)");
    }
    throw new Error(text || "Ошибка сервера");
  }
}

async function saveField(field, value) {
  const payload = JSON.stringify({ field, value });
  const opts = {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: payload
  };

  const endpoints = [
    { url: "/api/me/update", method: "POST" },
    { url: "/api/profile/update", method: "POST" },
    { url: "/api/profile", method: "PATCH" },
    { url: "/api/profile", method: "POST" }
  ];

  let lastError = "Сервер не обновлён. Остановите старый процесс и выполните: npm start";
  for (const ep of endpoints) {
    const res = await fetch(ep.url, { method: ep.method, ...opts });
    if (res.status === 404) continue;
    const data = await parseApiResponse(res);
    if (!res.ok) throw new Error(data.error || "Ошибка сохранения");
    return data.user;
  }
  throw new Error(lastError);
}

async function checkServerApi() {
  try {
    const res = await fetch("/api/health", { credentials: "same-origin" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.apiVersion >= 2 && data.profileUpdate;
  } catch {
    return false;
  }
}

function renderProfile(user) {
  currentUser = user;
  const nameEl = document.getElementById("accountDisplayName");
  const loginHint = document.getElementById("accountLoginHint");
  if (nameEl) nameEl.textContent = displayName(user);
  if (loginHint) loginHint.textContent = user.login;

  document.querySelectorAll("[data-field]").forEach((row) => {
    const field = row.dataset.field;
    const valueEl = row.querySelector(".account-value");
    if (valueEl) valueEl.textContent = formatValue(field, user);
  });

  const adminLink = document.getElementById("profileAdminLink");
  if (adminLink) {
    if (user.isAdmin) adminLink.classList.remove("hidden");
    else adminLink.classList.add("hidden");
  }
}

function bindProfilePage() {
  document.querySelectorAll(".account-row[data-field] .account-edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.closest("[data-field]")?.dataset.field;
      if (!field || !currentUser) return;
      openEditModal(field, formatValue(field, currentUser));
    });
  });

  const form = document.getElementById("editModalForm");
  const msg = document.getElementById("editModalMsg");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const modal = document.getElementById("editModal");
    const field = modal?.dataset.field;
    const input = document.getElementById("editModalInput");
    if (!field || !input) return;

    try {
      const user = await saveField(field, input.value.trim());
      renderProfile(user);
      closeEditModal();
    } catch (err) {
      if (msg) {
        msg.textContent = err.message;
        msg.classList.add("auth-msg--error");
      }
    }
  });

  document.getElementById("editModalClose")?.addEventListener("click", closeEditModal);
  document.getElementById("editModalCancel")?.addEventListener("click", closeEditModal);
  document.getElementById("editModal")?.addEventListener("click", (e) => {
    if (e.target.id === "editModal") closeEditModal();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutUser();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initSiteHeader();
  bindProfilePage();

  checkServerApi().then((ok) => {
    if (ok) return;
    const panel = document.querySelector(".account-panel");
    if (!panel) return;
    const warn = document.createElement("p");
    warn.className = "auth-msg auth-msg--error";
    warn.style.margin = "0 20px 12px";
    warn.textContent =
      "Сервер устарел или не запущен. Закройте старый терминал и выполните в папке проекта: npm start";
    panel.prepend(warn);
  });

  fetchMe()
    .then(({ user }) => {
      if (!user) {
        window.location.href = "/login.html";
        return;
      }
      renderProfile(user);
    })
    .catch(() => {
      window.location.href = "/login.html";
    });
});
