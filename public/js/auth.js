async function fetchMe() {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Не удалось проверить сессию");
  return res.json();
}

async function logoutUser() {
  await fetch("/api/logout", { method: "POST", credentials: "same-origin" });
  window.location.href = "/login.html";
}

function showAuthMessage(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("auth-msg--error", Boolean(isError));
  el.classList.toggle("auth-msg--ok", !isError && Boolean(text));
}

function initSiteHeader(options = {}) {
  const headerAccount = document.getElementById("headerAccount");
  const cartToggle = document.getElementById("cartToggle");
  const navAdmin = document.getElementById("navAdmin");

  fetchMe()
    .then(({ user }) => {
      if (headerAccount) {
        if (user) {
          headerAccount.href = "/profile.html";
          headerAccount.textContent = "Личный кабинет";
          headerAccount.classList.add("account-toggle--in");
          headerAccount.setAttribute("aria-label", "Личный кабинет");
        } else {
          headerAccount.href = "/login.html";
          headerAccount.textContent = "Вход";
          headerAccount.classList.remove("account-toggle--in");
          headerAccount.setAttribute("aria-label", "Вход");
        }
      }

      if (cartToggle) {
        if (user) cartToggle.classList.remove("hidden");
        else cartToggle.classList.add("hidden");
      }

      if (navAdmin) {
        if (user && user.isAdmin) navAdmin.classList.remove("hidden");
        else navAdmin.classList.add("hidden");
      }
    })
    .catch(() => {
      if (headerAccount) {
        headerAccount.href = "/login.html";
        headerAccount.textContent = "Вход";
      }
      if (cartToggle) cartToggle.classList.add("hidden");
    });
}
