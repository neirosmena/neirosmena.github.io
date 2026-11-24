/* ============================================================
   Плашка cookie: запоминает выбор в localStorage.
   Сайт использует только техническое хранилище, без аналитики.
   ============================================================ */

(() => {
  "use strict";

  const STORAGE_KEY = "ai-store-cookie-consent";
  const banner = document.getElementById("cookieBanner");

  if (!banner) return;

  const acceptButton = banner.querySelector(".js-cookie-accept");
  const necessaryButton = banner.querySelector(".js-cookie-necessary");
  const settingsButtons = document.querySelectorAll(".js-cookie-settings");

  const showBanner = (focusButton) => {
    banner.hidden = false;
    window.requestAnimationFrame(() => {
      banner.classList.add("is-visible");
    });

    if (focusButton && acceptButton) {
      window.setTimeout(() => acceptButton.focus({ preventScroll: true }), 60);
    }
  };

  const hideBanner = () => {
    banner.classList.remove("is-visible");
    window.setTimeout(() => {
      banner.hidden = true;
    }, 260);
  };

  const saveChoice = (choice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        choice,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      /* Если localStorage недоступен, просто скрываем плашку на этой странице. */
    }
    hideBanner();
  };

  let savedChoice = null;

  try {
    savedChoice = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    savedChoice = null;
  }

  if (!savedChoice) {
    window.setTimeout(() => showBanner(false), 500);
  }

  if (acceptButton) {
    acceptButton.addEventListener("click", () => saveChoice("accepted"));
  }

  if (necessaryButton) {
    necessaryButton.addEventListener("click", () => saveChoice("necessary"));
  }

  settingsButtons.forEach((button) => {
    button.addEventListener("click", () => showBanner(true));
  });
})();
