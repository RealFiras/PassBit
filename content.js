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
      .${MARKER_CLASS}[data-passbit-state="checking"] { border-color: #22d3ee !important; box-shadow: 0 0 0 2px rgba(34,211,238,.22), 0 0 16px rgba(34,211,238,.22) !important; }
      .${MARKER_CLASS}[data-passbit-state="weak"] { border-color: #fb4b72 !important; box-shadow: 0 0 0 2px rgba(251,75,114,.22), 0 0 16px rgba(251,75,114,.18) !important; }
      .${MARKER_CLASS}[data-passbit-state="moderate"] { border-color: #facc15 !important; box-shadow: 0 0 0 2px rgba(250,204,21,.22), 0 0 16px rgba(250,204,21,.16) !important; }
      .${MARKER_CLASS}[data-passbit-state="strong"] { border-color: #34d399 !important; box-shadow: 0 0 0 2px rgba(52,211,153,.22), 0 0 16px rgba(52,211,153,.16) !important; }
      .${MARKER_CLASS}[data-passbit-state="leaked"] { border-color: #fb4b72 !important; box-shadow: 0 0 0 2px rgba(251,75,114,.28), 0 0 18px rgba(251,75,114,.24) !important; }
      .${MARKER_CLASS}[data-passbit-state="error"] { border-color: #a78bfa !important; box-shadow: 0 0 0 2px rgba(167,139,250,.22) !important; }
      .${ACTION_CLASS}, .${PANEL_CLASS} { direction: rtl; font-family: Tahoma, Arial, sans-serif; }
      .${ACTION_CLASS} { position: fixed; z-index: 2147483646; display: none; border: 1px solid rgba(34,211,238,.65); border-radius: 9px; padding: 8px 10px; color: #e7fbff; background: rgba(8,18,32,.96); box-shadow: 0 8px 22px rgba(0,0,0,.32), 0 0 16px rgba(34,211,238,.16); font-size: 12px; font-weight: 700; cursor: pointer; }
      .${ACTION_CLASS}[data-visible="true"] { display: block; }
      .${ACTION_CLASS}:hover { border-color: #a78bfa; color: #fff; }
      .${PANEL_CLASS} { position: fixed; z-index: 2147483647; display: none; width: min(310px, calc(100vw - 24px)); padding: 14px; border: 1px solid rgba(34,211,238,.48); border-radius: 14px; color: #eef6ff; background: rgba(10,18,32,.97); box-shadow: 0 18px 45px rgba(0,0,0,.42), 0 0 22px rgba(34,211,238,.12); font-size: 12px; }
      .${PANEL_CLASS}[data-visible="true"] { display: block; }
      .${PANEL_CLASS} .passbit-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 9px; }
      .${PANEL_CLASS} .passbit-panel-title { margin: 0; color: #fff; font-size: 14px; font-weight: 700; }
      .${PANEL_CLASS} .passbit-panel-close { border: 0; padding: 2px 4px; background: transparent; color: #9aaac1; font-size: 16px; cursor: pointer; }
      .${PANEL_CLASS} .passbit-panel-result { margin: 0; color: #bfeeff; font-size: 13px; font-weight: 700; }
      .${PANEL_CLASS} .passbit-panel-breach { margin: 6px 0 0; color: #b3c0d3; font-size: 11px; line-height: 1.45; }
      .${PANEL_CLASS} .passbit-panel-list { display: grid; gap: 5px; margin: 10px 0 0; padding: 0; list-style: none; }
      .${PANEL_CLASS} .passbit-panel-list li { position: relative; padding-right: 13px; color: #d3dfed; font-size: 11px; line-height: 1.4; }
      .${PANEL_CLASS} .passbit-panel-list li::before { position: absolute; right: 0; top: 5px; width: 5px; height: 5px; border: 1px solid #a78bfa; border-radius: 50%; content: ""; }
      .${PANEL_CLASS} .passbit-panel-note { margin: 10px 0 0; color: #7f91aa; font-size: 10px; line-height: 1.45; }
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
    const note = document.createElement("p");
    note.className = "passbit-panel-note";
    note.textContent = "الفحص المحلي أولًا. لا يتم إرسال كلمة المرور نفسها.";
    panel.append(head, result, breach, list, note);
    document.documentElement.appendChild(panel);
    return { panel, close, result, breach, list };
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

  function renderPanelSuggestions(panel, suggestions) {
    panel.list.replaceChildren();
    (Array.isArray(suggestions) ? suggestions : []).slice(0, 4).forEach((suggestion) => {
      const item = document.createElement("li");
      item.textContent = suggestion;
      panel.list.appendChild(item);
    });
  }

  function scanField(field) {
    const entry = TRACKED.get(field);
    if (!entry) return;
    const password = field.value || "";
    showPanel(field);
    if (!password) {
      entry.panel.result.textContent = "اكتب كلمة المرور أولًا";
      entry.panel.breach.textContent = "لا يوجد شيء لفحصه بعد.";
      entry.panel.list.replaceChildren();
      return;
    }

    const result = globalThis.PassBitEntropy.analyzePassword(password, { contextWords: getContextWords(field) });
    setState(field, result.band.id, `القوة ${result.band.labelAr}`);
    entry.panel.result.textContent = `القوة: ${result.band.labelAr} — ${result.entropyBits} بت`;
    entry.panel.breach.textContent = "جارٍ فحص التسريبات المعروفة…";
    renderPanelSuggestions(entry.panel, result.suggestionsAr);

    chrome.runtime.sendMessage({ type: "PASSBIT_CHECK_BREACH", password }, (response) => {
      if (chrome.runtime.lastError || !response || !response.ok) {
        setState(field, "error", "تعذر فحص التسريبات");
        entry.panel.breach.textContent = "تعذر الاتصال الآن. لم نعتبر كلمة المرور نظيفة.";
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
