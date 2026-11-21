/* ============================================================
   Нейросмена — логика интерфейса
   Чистый JavaScript, без зависимостей
   ============================================================ */

(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Шапка: фон при прокрутке ---------- */

  const header = $("#siteHeader");

  const updateHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  /* ---------- Мобильное меню ---------- */

  const menuToggle = $("#menuToggle");
  const mobileMenu = $("#mobileMenu");
  let menuOpen = false;

  const setMenu = (open) => {
    if (!menuToggle || !mobileMenu) return;
    menuOpen = open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mobileMenu.hidden = !open;
  };

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => setMenu(!menuOpen));

    $$("a", mobileMenu).forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("click", (event) => {
      if (!menuOpen) return;
      if (mobileMenu.contains(event.target) || menuToggle.contains(event.target)) return;
      setMenu(false);
    });

    const desktop = window.matchMedia("(min-width: 1024px)");
    desktop.addEventListener("change", (event) => {
      if (event.matches) setMenu(false);
    });
  }

  /* ---------- Подсветка активного раздела ---------- */

  const navLinks = $$(".nav-link");

  if ("IntersectionObserver" in window && navLinks.length) {
    const sections = navLinks
      .map((link) => $(link.getAttribute("href")))
      .filter(Boolean);

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const hash = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            if (link.getAttribute("href") === hash) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach((section) => navObserver.observe(section));
  }

  /* ---------- Появление блоков ---------- */

  const revealElements = $$(".reveal");

  const revealAll = () => {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  };

  window.addEventListener("error", revealAll);

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealAll();
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    revealElements.forEach((element) => revealObserver.observe(element));
  }

  /* ---------- Год в подвале ---------- */

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Модальное окно заявки ---------- */

  const modal = $("#orderModal");

  if (modal) {
    const panel = $(".modal-panel", modal);
    const formStep = $("#orderFormStep");
    const successStep = $("#orderSuccessStep");
    const errorStep = $("#orderErrorStep");
    const orderForm = $("#orderForm");
    const formNameField = $("#formNameField");
    const agentField = $("#agentField");
    const botField = $('input[name="bot-field"]', orderForm);

    const orderEyebrow = $("#orderEyebrow");
    const orderTitle = $("#orderTitle");
    const orderSubtitle = $("#orderSubtitle");
    const selectedAgentLabel = $("#selectedAgentLabel");
    const selectedAgentName = $("#selectedAgentName");
    const selectedAgentPrice = $("#selectedAgentPrice");

    const nameInput = $("#clientName");
    const nicheInput = $("#clientNiche");
    const telegramInput = $("#clientTelegram");

    const submitBtn = $("#submitBtn");
    const submitLabel = $("#submitLabel");
    const submitSpinner = $("#submitSpinner");
    const submitArrow = $(".submit-arrow", submitBtn);

    const successName = $("#successName");
    const successTelegram = $("#successTelegram");
    const successAgent = $("#successAgent");
    const successNiche = $("#successNiche");

    const retryBtn = $("#retryBtn");
    const copyBtn = $("#copyBtn");
    const toast = $("#toast");

    const fields = {
      name: { input: nameInput, error: $("#clientNameError") },
      niche: { input: nicheInput, error: $("#clientNicheError") },
      telegram: { input: telegramInput, error: $("#clientTelegramError") }
    };

    const TELEGRAM_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
    const FORM_NAME = "ai-agent-order";

    let lastFocused = null;
    let activeAgent = "";
    let activePrice = "";
    let activeMode = "order";
    let isSubmitting = false;
    let justSubmitted = false;
    let lastValues = null;
    let toastTimer = null;

    const setStep = (step) => {
      formStep.hidden = step !== "form";
      successStep.hidden = step !== "success";
      errorStep.hidden = step !== "error";
      panel.classList.toggle("result-view", step !== "form");

      if (step === "success") {
        panel.setAttribute("aria-labelledby", "successTitle");
        panel.setAttribute("aria-describedby", "successText");
      } else if (step === "error") {
        panel.setAttribute("aria-labelledby", "errorTitle");
        panel.setAttribute("aria-describedby", "errorText");
      } else {
        panel.setAttribute("aria-labelledby", "orderTitle");
        panel.setAttribute("aria-describedby", "orderSubtitle");
      }

      panel.scrollTop = 0;
    };

    const setFieldError = (input, errorElement, message) => {
      if (!input || !errorElement) return;
      input.setAttribute("aria-invalid", "true");
      errorElement.textContent = message;
      errorElement.hidden = false;
    };

    const clearFieldError = (input, errorElement) => {
      if (!input || !errorElement) return;
      input.removeAttribute("aria-invalid");
      errorElement.textContent = "";
      errorElement.hidden = true;
    };

    const clearErrors = () => {
      Object.values(fields).forEach(({ input, error }) => clearFieldError(input, error));
    };

    const normalizeTelegram = (raw) => {
      let value = String(raw || "").trim();
      value = value.replace(/^https?:\/\/(?:www\.)?(?:t\.me|telegram\.me)\//i, "");
      value = value.replace(/^@/, "");
      value = value.split(/[/?#\s]/)[0];
      return value;
    };

    const validateForm = () => {
      clearErrors();
      let firstInvalid = null;

      const name = nameInput.value.trim().replace(/\s+/g, " ");
      if (name.length < 2) {
        setFieldError(nameInput, fields.name.error, "Укажите имя — хотя бы 2 символа.");
        firstInvalid = firstInvalid || nameInput;
      }

      const niche = nicheInput.value.trim().replace(/\s+/g, " ");
      if (niche.length < 2) {
        setFieldError(nicheInput, fields.niche.error, "Опишите нишу бизнеса — хотя бы 2 символа.");
        firstInvalid = firstInvalid || nicheInput;
      }

      const telegram = normalizeTelegram(telegramInput.value);
      if (!telegram) {
        setFieldError(telegramInput, fields.telegram.error, "Укажите ник в Telegram для связи.");
        firstInvalid = firstInvalid || telegramInput;
      } else if (!TELEGRAM_PATTERN.test(telegram)) {
        setFieldError(
          telegramInput,
          fields.telegram.error,
          "Ник должен содержать 5–32 латинские буквы, цифры или _. Например: @ivan_petrov."
        );
        firstInvalid = firstInvalid || telegramInput;
      }

      if (firstInvalid) {
        firstInvalid.focus();
        return null;
      }

      return {
        name,
        niche,
        telegram: `@${telegram}`,
        agent: activeAgent,
        price: activePrice,
        mode: activeMode
      };
    };

    const setSubmitting = (submitting) => {
      isSubmitting = submitting;
      submitBtn.disabled = submitting;
      submitBtn.setAttribute("aria-busy", String(submitting));
      submitLabel.textContent = submitting ? "Отправляем…" : "Отправить заявку";
      submitSpinner.hidden = !submitting;
      if (submitArrow) submitArrow.hidden = submitting;
    };

    const showToast = (message) => {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("is-visible");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.classList.remove("is-visible");
      }, 3200);
    };

    const showSuccess = (values) => {
      justSubmitted = true;
      lastValues = values;

      const firstName = values.name.split(" ")[0] || values.name;
      if (successName) successName.textContent = firstName;
      if (successTelegram) successTelegram.textContent = values.telegram;
      if (successAgent) successAgent.textContent = values.agent;
      if (successNiche) successNiche.textContent = values.niche;

      setStep("success");

      window.requestAnimationFrame(() => {
        const title = $("#successTitle", successStep);
        if (!title) return;
        title.setAttribute("tabindex", "-1");
        title.focus({ preventScroll: true });
      });
    };

    const showSubmitError = (values) => {
      lastValues = values;
      setStep("error");
      window.requestAnimationFrame(() => {
        const title = $("#errorTitle", errorStep);
        if (!title) return;
        title.setAttribute("tabindex", "-1");
        title.focus({ preventScroll: true });
      });
    };

    const resetForm = () => {
      orderForm.reset();
      if (formNameField) formNameField.value = FORM_NAME;
      if (agentField) agentField.value = activeAgent;
      clearErrors();
    };

    const openModal = ({ agent, price, mode }) => {
      lastFocused = document.activeElement;
      activeAgent = agent || "Подбор агента";
      activePrice = price || "";
      activeMode = mode === "consult" ? "consult" : "order";

      if (justSubmitted) {
        resetForm();
        justSubmitted = false;
        lastValues = null;
      }

      const isConsult = activeMode === "consult";

      orderEyebrow.textContent = isConsult ? "Консультация" : "Заказ внедрения";
      orderTitle.textContent = isConsult ? "Обсудим вашу задачу" : activeAgent;
      orderSubtitle.textContent = isConsult
        ? "Оставьте контакты — уточним задачу, зададим пару вопросов и предложим подходящего агента. Без обязательств."
        : `Оставьте контакты — вернёмся в Telegram, уточним детали и пришлём план внедрения агента «${activeAgent}».`;

      selectedAgentLabel.textContent = isConsult ? "Тема обращения" : "Выбранный агент";
      selectedAgentName.textContent = activeAgent;
      selectedAgentPrice.textContent = activePrice;
      selectedAgentPrice.hidden = !activePrice;
      agentField.value = activeAgent;

      clearErrors();
      setStep("form");

      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");

      panel.focus({ preventScroll: true });
      window.requestAnimationFrame(() => {
        if (modal.classList.contains("is-open") && !modal.contains(document.activeElement)) {
          panel.focus({ preventScroll: true });
        }
      });
      window.setTimeout(() => {
        if (modal.classList.contains("is-open") && !modal.contains(document.activeElement)) {
          panel.focus({ preventScroll: true });
        }
      }, 300);
    };

    const closeModal = () => {
      if (!modal.classList.contains("is-open")) return;

      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");

      if (lastFocused && typeof lastFocused.focus === "function" && document.contains(lastFocused)) {
        lastFocused.focus({ preventScroll: true });
      }
    };

    const copyRequest = async () => {
      const values = lastValues || {
        agent: activeAgent,
        name: nameInput.value.trim(),
        niche: nicheInput.value.trim(),
        telegram: telegramInput.value.trim()
      };

      const lines = [
        "Заявка на внедрение ИИ-агента — Нейросмена",
        `Тема: ${activeMode === "consult" ? "консультация" : values.agent}`,
        `Имя: ${values.name || "—"}`,
        `Ниша: ${values.niche || "—"}`,
        `Telegram: ${values.telegram || "—"}`
      ];

      let copied = false;

      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(lines.join("\n"));
          copied = true;
        } catch (error) {
          copied = false;
        }
      }

      if (!copied) {
        const area = document.createElement("textarea");
        area.value = lines.join("\n");
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.top = "0";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        try {
          copied = document.execCommand("copy");
        } catch (error) {
          copied = false;
        }
        area.remove();
      }

      showToast(copied ? "Заявка скопирована" : "Не удалось скопировать — попробуйте ещё раз");
    };

    /* Открытие по кнопкам каталога, CTA и подвала */
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest(".js-order");
      if (!trigger) return;
      event.preventDefault();
      openModal({
        agent: trigger.dataset.agent,
        price: trigger.dataset.price,
        mode: trigger.dataset.mode
      });
    });

    /* Закрытие: крестик, подложка, кнопки результата */
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-modal]")) closeModal();
    });

    /* Esc и удержание фокуса внутри окна */
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (modal.classList.contains("is-open")) {
        event.preventDefault();
        closeModal();
      } else if (menuOpen) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    panel.addEventListener("keydown", (event) => {
      if (event.key !== "Tab" || !modal.classList.contains("is-open")) return;

      const focusable = $$(
        'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        panel
      ).filter((element) => !element.hidden && element.offsetParent !== null);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === panel) {
          event.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    /* Очистка ошибок при вводе */
    Object.values(fields).forEach(({ input, error }) => {
      input.addEventListener("input", () => clearFieldError(input, error));
    });

    /* Приводим ник к виду @username при уходе из поля */
    telegramInput.addEventListener("blur", () => {
      const value = normalizeTelegram(telegramInput.value);
      if (!value) return;
      if (TELEGRAM_PATTERN.test(value)) {
        telegramInput.value = `@${value}`;
        clearFieldError(telegramInput, fields.telegram.error);
      }
    });

    /* Отправка в Netlify Forms */
    orderForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (isSubmitting) return;

      const values = validateForm();
      if (!values) return;

      const payload = new URLSearchParams({
        "form-name": FORM_NAME,
        "bot-field": botField ? botField.value : "",
        agent: values.agent,
        name: values.name,
        niche: values.niche,
        telegram: values.telegram
      });

      setSubmitting(true);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: payload.toString(),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        showSuccess(values);
      } catch (error) {
        console.error("Не удалось отправить заявку:", error);
        showSubmitError(values);
      } finally {
        window.clearTimeout(timeoutId);
        setSubmitting(false);
      }
    });

    retryBtn.addEventListener("click", () => {
      setStep("form");
      submitBtn.focus({ preventScroll: true });
    });

    copyBtn.addEventListener("click", copyRequest);
  }
})();
