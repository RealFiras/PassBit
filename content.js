"use strict";

(() => {
  const TRACKED = new WeakMap();
  const STYLE_ID = "passbit-content-style";
  const MARKER_CLASS = "passbit-field-marker";
  const OVERLAY_CLASS = "passbit-overlay";

  function addStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${MARKER_CLASS} { transition: border-color 160ms ease, box-shadow 160ms ease; }
      .${MARKER_CLASS}[data-passbit-state="checking"] { border-color: #22d3ee !important; box-shadow: 0 0 0 2px rgba(34,211,238,.22), 0 0 16px rgba(34,211,238,.22) !important; }
      .${MARKER_CLASS}[data-passbit-state="weak"] { border-color: #ff3b6b !important; box-shadow: 0 0 0 2px rgba(255,59,107,.22), 0 0 16px rgba(255,59,107,.18) !important; }
      .${MARKER_CLASS}[data-passbit-state="moderate"] { border-color: #facc15 !important; box-shadow: 0 0 0 2px rgba(250,204,21,.22), 0 0 16px rgba(250,204,21,.16) !important; }
      .${MARKER_CLASS}[data-passbit-state="strong"] { border-color: #34d399 !important; box-shadow: 0 0 0 2px rgba(52,211,153,.22), 0 0 16px rgba(52,211,153,.16) !important; }
      .${MARKER_CLASS}[data-passbit-state="leaked"] { border-color: #ff3b6b !important; box-shadow: 0 0 0 2px rgba(255,59,107,.28), 0 0 18px rgba(255,59,107,.24) !important; }
      .${MARKER_CLASS}[data-passbit-state="error"] { border-color: #a78bfa !important; box-shadow: 0 0 0 2px rgba(167,139,250,.22) !important; }
      .${OVERLAY_CLASS} { position: fixed; z-index: 2147483647; max-width: 260px; padding: 8px 10px; border: 1px solid rgba(34,211,238,.48); border-radius: 9px; color: #e7f7ff; background: rgba(11,18,32,.94); box-shadow: 0 10px 30px rgba(0,0,0,.32); font: 12px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; pointer-events: none; opacity: 0; transform: translateY(4px); transition: opacity 120ms ease, transform 120ms ease; }
      .${OVERLAY_CLASS}[data-visible="true"] { opacity: 1; transform: translateY(0); }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isPasswordField(element) {
    if (!(element instanceof HTMLInputElement)) return false;
    const type = (element.getAttribute("type") || "").toLowerCase();
    const autocomplete = (element.getAttribute("autocomplete") || "").toLowerCase();
    return type === "password" || autocomplete.includes("current-password") || autocomplete.includes("new-password");
  }

  function createOverlay() {
    const overlay = document.createElement("div");
    overlay.className = OVERLAY_CLASS;
    overlay.setAttribute("role", "status");
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function showOverlay(field, text) {
    const entry = TRACKED.get(field);
    if (!entry) return;
    const rect = field.getBoundingClientRect();
    entry.overlay.textContent = text;
    entry.overlay.style.left = `${Math.max(8, Math.min(window.innerWidth - 268, rect.left))}px`;
    entry.overlay.style.top = `${Math.min(window.innerHeight - 48, rect.bottom + 8)}px`;
    entry.overlay.dataset.visible = "true";
    window.clearTimeout(entry.hideTimer);
    entry.hideTimer = window.setTimeout(() => {
      entry.overlay.dataset.visible = "false";
    }, 4200);
  }

  function setState(field, state, label) {
    const entry = TRACKED.get(field);
    if (!entry) return;
    field.classList.add(MARKER_CLASS);
    field.dataset.passbitState = state;
    field.setAttribute("aria-label", `PassBit: ${label}`);
    showOverlay(field, `PassBit · ${label}`);
  }

  function checkBreach(field, password) {
    const localState = globalThis.PassBitEntropy.analyzePassword(password).band.id;
    chrome.runtime.sendMessage({ type: "PASSBIT_CHECK_BREACH", password }, (response) => {
      if (chrome.runtime.lastError) {
        setState(field, "error", "Breach check unavailable");
        return;
      }
      if (!response || !response.ok) {
        setState(field, "error", "Breach check unavailable");
        return;
      }
      if (response.status === "leaked") {
        setState(field, "leaked", `Found in breaches · ${response.count.toLocaleString()} occurrences`);
        return;
      }
      setState(field, localState, "Not found in known breaches");
    });
  }

  function analyze(field) {
    const password = field.value || "";
    if (!password) {
      field.removeAttribute("data-passbit-state");
      return;
    }
    const result = globalThis.PassBitEntropy.analyzePassword(password);
    setState(field, result.band.id, `${result.band.label} · ${result.entropyBits} bits`);
    checkBreach(field, password);
  }

  function track(field) {
    if (!isPasswordField(field) || TRACKED.has(field)) return;
    addStyle();
    const entry = { overlay: createOverlay(), hideTimer: 0, timer: 0 };
    TRACKED.set(field, entry);
    const schedule = () => {
      window.clearTimeout(entry.timer);
      entry.timer = window.setTimeout(() => analyze(field), 180);
    };
    field.addEventListener("input", schedule, { passive: true });
    field.addEventListener("change", schedule, { passive: true });
    field.addEventListener("focus", schedule, { passive: true });
    field.addEventListener("blur", () => {
      window.clearTimeout(entry.hideTimer);
      entry.overlay.dataset.visible = "false";
    }, { passive: true });
    if (field.value) schedule();
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
