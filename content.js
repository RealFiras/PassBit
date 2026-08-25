"use strict";

(() => {
  const TRACKED = new WeakMap();
  const TRACKED_FIELDS = new Set();
  const STYLE_ID = "passbit-content-style";
  const MARKER_CLASS = "passbit-field-marker";
  const ACTION_CLASS = "passbit-page-action";
  const PANEL_CLASS = "passbit-page-panel";

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${MARKER_CLASS} { transition: border-color 160ms ease, box-shadow 160ms ease; }
      .${MARKER_CLASS}[data-passbit-state="checking"] { border-color: #2563eb !important; box-shadow: 0 0 0 2px #dbe6ff !important; }
      .${MARKER_CLASS}[data-passbit-state="weak"] { border-color: #ba1a1a !important; box-shadow: 0 0 0 2px #ffdad6 !important; }
      .${MARKER_CLASS}[data-passbit-state="moderate"] { border-color: #a95400 !important; box-shadow: 0 0 0 2px #fff0d9 !important; }
      .${MARKER_CLASS}[data-passbit-state="strong"] { border-color: #087f5b !important; box-shadow: 0 0 0 2px #d8f4e8 !important; }
      .${MARKER_CLASS}[data-passbit-state="leaked"] { border-color: #ba1a1a !important; box-shadow: 0 0 0 2px #ffdad6 !important; }
      .${MARKER_CLASS}[data-passbit-state="error"] { border-color: #737686 !important; box-shadow: 0 0 0 2px #e5e7ef !important; }
      .${ACTION_CLASS}, .${PANEL_CLASS} { direction: rtl; font-family: "IBM Plex Sans Arabic", Tahoma, Arial, sans-serif; }
      .${ACTION_CLASS} { position: fixed; z-index: 2147483646; display: none; border: 1px solid #c3c6d7; border-radius: 6px; padding: 8px 10px; color: #004ac6; background: #ffffff; box-shadow: 0 4px 14px rgba(21,28,39,.14); font-size: 12px; font-weight: 600; cursor: pointer; }
      .${ACTION_CLASS}[data-visible="true"] { display: block; }
      .${ACTION_CLASS}:hover { border-color: #2563eb; background: #f0f3ff; }
      .${PANEL_CLASS} { position: fixed; z-index: 2147483647; display: none; width: min(310px, calc(100vw - 24px)); padding: 14px; border: 1px solid #c3c6d7; border-radius: 8px; color: #151c27; background: #ffffff; box-shadow: 0 8px 24px rgba(21,28,39,.18); font-size: 12px; }
      .${PANEL_CLASS}[data-visible="true"] { display: block; }
      .${PANEL_CLASS} .passbit-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
      .${PANEL_CLASS} .passbit-panel-title { margin: 0; color: #151c27; font-size: 14px; font-weight: 600; }
      .${PANEL_CLASS} .passbit-panel-close { border: 0; padding: 2px 4px; background: transparent; color: #5f6675; font-size: 16px; cursor: pointer; }
      .${PANEL_CLASS} .passbit-panel-result { margin: 0; color: #004ac6; font-size: 13px; font-weight: 600; }
      .${PANEL_CLASS} .passbit-panel-breach { margin: 6px 0 0; color: #434655; font-size: 11px; line-height: 1.45; }
      .${PANEL_CLASS} .passbit-panel-list { display: grid; gap: 5px; margin: 10px 0 0; padding: 0; list-style: none; }
      .${PANEL_CLASS} .passbit-panel-list li { position: relative; padding-right: 13px; color: #434655; font-size: 11px; line-height: 1.4; }
      .${PANEL_CLASS} .passbit-panel-list li::before { position: absolute; right: 0; top: 5px; width: 5px; height: 5px; border: 1px solid #2563eb; border-radius: 50%; content: ""; }
      .${PANEL_CLASS} .passbit-panel-note { margin: 10px 0 0; color: #737686; font-size: 10px; line-height: 1.45; }
      .${PANEL_CLASS} .passbit-panel-retry { display: none; margin-top: 8px; border: 1px solid #2563eb; border-radius: 6px; padding: 6px 8px; background: #dbe6ff; color: #004ac6; font-size: 10px; font-weight: 600; cursor: pointer; }
      .${PANEL_CLASS} .passbit-panel-retry[data-visible="true"] { display: inline-block; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isPasswordField(element) {
    if (!(element instanceof HTMLInputElement)) return false;
    const type = (element.getAttribute("type") || "").toLowerCase();
    const autocomplete = (element.getAttribute("autocomplete") || "").toLowerCase();
    return type === "password" || autocomplete.includes("current-password") || autocomplete.includes("new-password");
  }

  function getContextWords(field) {
    const ignored = new Set(["password", "pass", "pwd", "login", "user", "username", "email", "account", "current", "new", "confirm"]);
    const labelText = field.labels ? Array.from(field.labels).map((label) => label.textContent || "").join(" ") : "";
    const raw = [location.hostname, document.title, field.name, field.id, field.getAttribute("aria-label"), field.getAttribute("placeholder"), labelText].filter(Boolean).join(" ");
    return raw.split(/[^\p{L}\p{N}]+/u).map((word) => word.trim()).filter((word) => word.length >= 4 && !ignored.has(word.toLowerCase())).slice(0, 20);
  }

  function createPanel() {
    const panel = document.createElement("section");
    panel.className = PANEL_CLASS;
    panel.setAttribute("role", "status");
    panel.setAttribute("aria-live", "polite");

    const head = document.createElement("div");
    head.className = "passbit-panel-head";
    const title = document.createElement("p");
    title.className = "passbit-panel-title";
    title.textContent = "PassBit — فحص سريع";
    const close = document.createElement("button");
    close.className = "passbit-panel-close";
    close.type = "button";
    close.setAttribute("aria-label", "إغلاق");
    close.textContent = "×";
    head.append(title, close);

    const result = document.createElement("p");
    result.className = "passbit-panel-result";
    const breach = document.createElement("p");
    breach.className = "passbit-panel-breach";
    const list = document.createElement("ul");
    list.className = "passbit-panel-list";
    const retry = document.createElement("button");
    retry.className = "passbit-panel-retry";
    retry.type = "button";
    retry.textContent = "إعادة فحص التسريب";
    const note = document.createElement("p");
    note.className = "passbit-panel-note";
    note.textContent = "الفحص المحلي أولًا. لا يتم إرسال كلمة المرور نفسها أو سياق الصفحة.";
    panel.append(head, result, breach, retry, list, note);
    document.documentElement.appendChild(panel);
    return { panel, close, result, breach, retry, list };
  }

  function createActionButton() {
    const button = document.createElement("button");
    button.className = ACTION_CLASS;
    button.type = "button";
    button.textContent = "PB · فحص";
    button.setAttribute("aria-label", "فحص كلمة المرور بواسطة PassBit");
    document.documentElement.appendChild(button);
    return button;
  }

  function positionElement(field, element, gap = 7) {
    const rect = field.getBoundingClientRect();
    const width = element.offsetWidth || 116;
    const height = element.offsetHeight || 34;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width));
    const top = rect.bottom + gap + height <= window.innerHeight ? rect.bottom + gap : Math.max(8, rect.top - gap - height);
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
  }

  function showAction(field) {
    const entry = TRACKED.get(field);
    if (!entry) return;
    entry.action.dataset.visible = "true";
    positionElement(field, entry.action);
    window.clearTimeout(entry.hideTimer);
    entry.hideTimer = window.setTimeout(() => {
      entry.action.dataset.visible = "false";
    }, 9000);
  }

  function showPanel(field) {
    const entry = TRACKED.get(field);
    if (!entry) return;
    entry.panel.panel.dataset.visible = "true";
    positionElement(field, entry.panel.panel, 8);
    window.clearTimeout(entry.hideTimer);
  }

  function setState(field, state, label) {
    field.classList.add(MARKER_CLASS);
    field.dataset.passbitState = state;
    field.setAttribute("aria-label", `PassBit: ${label}`);
  }

  function renderPanelReasons(panel, result) {
    panel.list.replaceChildren();
    const localReasons = Array.isArray(result?.findingsAr) ? result.findingsAr : [];
    const suggestions = Array.isArray(result?.suggestionsAr) ? result.suggestionsAr : [];
    const reasons = [...localReasons, ...suggestions.slice(0, 3)];
    if (!reasons.length) reasons.push("لم نكتشف نمطًا شائعًا في الفحص المحلي.");
    reasons.slice(0, 6).forEach((reason) => {
      const item = document.createElement("li");
      item.textContent = reason;
      panel.list.appendChild(item);
    });
  }

  function breachErrorMessage(status) {
    const messages = {
      network_error: "لا يوجد اتصال بالشبكة الآن. التقييم المحلي متاح.",
      timeout: "انتهت مهلة الاتصال. لم نعتبر كلمة المرور نظيفة.",
      rate_limited: "الخدمة طلبت الانتظار قليلًا. حاول إعادة الفحص لاحقًا.",
      service_unavailable: "خدمة فحص التسريبات غير متاحة مؤقتًا.",
      http_error: "تعذر الوصول إلى خدمة فحص التسريبات.",
      invalid_response: "تعذر قراءة استجابة خدمة التسريبات.",
    };
    return messages[status] || "تعذر فحص التسريبات الآن. لم نعتبر كلمة المرور نظيفة.";
  }

  function scanField(field) {
    const entry = TRACKED.get(field);
    if (!entry) return;
    const password = field.value || "";
    showPanel(field);
    entry.panel.retry.dataset.visible = "false";
    if (!password) {
      entry.panel.result.textContent = "اكتب كلمة المرور أولًا";
      entry.panel.breach.textContent = "لا يوجد شيء لفحصه بعد.";
      entry.panel.list.replaceChildren();
      return;
    }

    const result = globalThis.PassBitEntropy.analyzePassword(password, { contextWords: getContextWords(field) });
    setState(field, result.band.id, `القوة ${result.band.labelAr}`);
    entry.panel.result.textContent = `القوة: ${result.band.labelAr} — ${result.effectiveEntropyBits} بت تقديرية`;
    entry.panel.breach.textContent = "جارٍ فحص التسريبات المعروفة…";
    renderPanelReasons(entry.panel, result);

    chrome.runtime.sendMessage({ type: "PASSBIT_CHECK_BREACH", password }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        setState(field, "error", "تعذر فحص التسريبات");
        entry.panel.breach.textContent = breachErrorMessage(response?.status || "network_error");
        entry.panel.retry.dataset.visible = response?.status === "invalid_input" ? "false" : "true";
        return;
      }
      if (response.status === "leaked") {
        setState(field, "leaked", "ظهرت في تسريب");
        entry.panel.result.textContent = "لا تستخدمها — ظهرت في تسريب";
        entry.panel.breach.textContent = `تم العثور عليها ${response.count.toLocaleString("ar-EG")} مرة في قاعدة التسريبات.`;
        return;
      }
      setState(field, result.band.id, `القوة ${result.band.labelAr}`);
      entry.panel.breach.textContent = result.band.id === "strong"
        ? "لم تظهر في التسريبات المعروفة. هذه إشارة جيدة وليست ضمانًا كاملًا."
        : "لم تظهر في التسريبات المعروفة، لكن طبّق الاقتراحات لتحسينها.";
    });
  }

  function track(field) {
    if (!isPasswordField(field) || TRACKED.has(field)) return;
    addStyle();
    const action = createActionButton();
    const panel = createPanel();
    const entry = { action, panel, hideTimer: 0 };
    TRACKED.set(field, entry);
    TRACKED_FIELDS.add(field);

    field.addEventListener("dblclick", () => showAction(field), { passive: true });
    field.addEventListener("input", () => {
      field.removeAttribute("data-passbit-state");
      entry.panel.panel.dataset.visible = "false";
      entry.action.dataset.visible = "false";
    }, { passive: true });
    field.addEventListener("focus", () => {
      if (entry.panel.panel.dataset.visible === "true") positionElement(field, entry.panel.panel, 8);
    }, { passive: true });
    field.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!entry.panel.panel.matches(":hover") && !entry.action.matches(":hover")) {
          entry.action.dataset.visible = "false";
        }
      }, 300);
    }, { passive: true });

    action.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      action.dataset.visible = "false";
      scanField(field);
    });
    panel.close.addEventListener("click", () => {
      panel.panel.dataset.visible = "false";
    });
    panel.retry.addEventListener("click", () => scanField(field));
  }

  function scan(root) {
    if (root instanceof HTMLInputElement) track(root);
    if (!root.querySelectorAll) return;
    root.querySelectorAll("input[type='password'], input[autocomplete*='password' i]").forEach(track);
  }

  function start() {
    addStyle();
    scan(document);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
        });
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("scroll", () => {
      TRACKED_FIELDS.forEach((field) => {
        if (!field.isConnected) {
          TRACKED_FIELDS.delete(field);
          return;
        }
        const entry = TRACKED.get(field);
        if (!entry) return;
        if (entry.action.dataset.visible === "true") positionElement(field, entry.action);
        if (entry.panel.panel.dataset.visible === "true") positionElement(field, entry.panel.panel, 8);
      });
    }, { passive: true });
    window.addEventListener("resize", () => {
      document.querySelectorAll(`.${PANEL_CLASS}[data-visible="true"]`).forEach((panel) => {
        panel.style.maxWidth = "calc(100vw - 24px)";
      });
    }, { passive: true });
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) return;
      document.querySelectorAll(`.${PANEL_CLASS}[data-visible="true"]`).forEach((panel) => {
        if (!panel.contains(event.target)) panel.dataset.visible = "false";
      });
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
