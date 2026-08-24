"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password-input");
  const toggleButton = document.getElementById("toggle-password");
  const entropyValue = document.getElementById("entropy-value");
  const strengthBadge = document.getElementById("strength-badge");
  const progressBar = document.getElementById("progress-bar");
  const lengthLabel = document.getElementById("length-label");
  const poolValue = document.getElementById("pool-value");
  const breachIcon = document.getElementById("breach-icon");
  const breachValue = document.getElementById("breach-value");
  const statusCard = document.getElementById("status-card");
  const statusIcon = document.getElementById("status-icon");
  const statusTitle = document.getElementById("status-title");
  const statusText = document.getElementById("status-text");
  const suggestionsList = document.getElementById("suggestions-list");
  const suggestionCount = document.getElementById("suggestion-count");

  let breachRequestId = 0;
  let breachTimer = 0;
  let currentBand = "neutral";

  function setClasses(element, ...classes) {
    element.className = classes.filter(Boolean).join(" ");
  }

  function resetBreachStatus() {
    setClasses(breachIcon, "metric-icon", "purple");
    breachIcon.textContent = "◇";
    breachValue.textContent = "Not checked";
  }

  function renderSuggestions(suggestions) {
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
    suggestionsList.replaceChildren();
    suggestionCount.textContent = String(safeSuggestions.length);
    if (safeSuggestions.length === 0) {
      const item = document.createElement("li");
      item.className = "empty-suggestion";
      item.textContent = "No additional actions for this local estimate.";
      suggestionsList.appendChild(item);
      return;
    }
    safeSuggestions.slice(0, 4).forEach((suggestion) => {
      const item = document.createElement("li");
      item.textContent = suggestion;
      suggestionsList.appendChild(item);
    });
  }

  function renderEmpty() {
    currentBand = "neutral";
    entropyValue.textContent = "0.0";
    poolValue.textContent = "0";
    lengthLabel.textContent = "0 characters";
    progressBar.style.width = "0%";
    progressBar.style.background = "var(--cyan)";
    setClasses(strengthBadge, "strength-badge", "neutral");
    strengthBadge.textContent = "Waiting";
    setClasses(statusCard, "status-card", "neutral");
    statusIcon.textContent = "i";
    statusTitle.textContent = "Start with a password";
    statusText.textContent = "Your password is analyzed in this browser. The breach check is optional and uses a partial hash only.";
    resetBreachStatus();
    renderSuggestions([]);
  }

  function renderLocalAnalysis(result) {
    currentBand = result.band.id;
    entropyValue.textContent = result.entropyBits.toFixed(1);
    poolValue.textContent = String(result.poolSize);
    lengthLabel.textContent = `${result.length} ${result.length === 1 ? "character" : "characters"}`;
    progressBar.style.width = `${result.progressPercent}%`;
    progressBar.style.background = `var(--${result.band.color})`;
    setClasses(strengthBadge, "strength-badge", result.band.id);
    strengthBadge.textContent = result.band.label;
    setClasses(statusCard, "status-card", result.band.id);
    statusIcon.textContent = result.band.id === "strong" ? "✓" : result.band.id === "moderate" ? "!" : "×";
    statusTitle.textContent = result.band.id === "strong" ? "Good local estimate" : `${result.band.label} password`; 
    statusText.textContent = result.band.advice;
    resetBreachStatus();
    renderSuggestions(result.suggestions);
  }

  function renderBreachChecking() {
    setClasses(breachIcon, "metric-icon", "cyan");
    breachIcon.textContent = "…";
    breachValue.textContent = "Checking…";
  }

  function renderBreachResult(result) {
    if (result.status === "leaked") {
      setClasses(breachIcon, "metric-icon", "purple");
      breachIcon.textContent = "!";
      breachValue.textContent = `${result.count.toLocaleString()} hits`;
      setClasses(statusCard, "status-card", "leaked");
      statusIcon.textContent = "!";
      statusTitle.textContent = "Do not use this password";
      statusText.textContent = "This exact password appears in known breach data. Change it anywhere it was reused.";
      return;
    }
    if (result.status === "clean") {
      setClasses(breachIcon, "metric-icon", "cyan");
      breachIcon.textContent = "✓";
      breachValue.textContent = "Clean result";
      const cleanClass = currentBand === "strong" ? "clean" : currentBand;
      setClasses(statusCard, "status-card", cleanClass);
      statusIcon.textContent = currentBand === "strong" ? "✓" : "!";
      statusTitle.textContent = currentBand === "strong" ? "Not found in known breaches" : "Not breached, but improve it";
      statusText.textContent = currentBand === "strong"
        ? "This is not proof of safety, but the queried password was not returned by the breach corpus."
        : `The queried password was not returned by the breach corpus, but its local estimate is ${currentBand}.`;
      return;
    }
    setClasses(breachIcon, "metric-icon", "purple");
    breachIcon.textContent = "◇";
    breachValue.textContent = "Not checked";
  }

  function requestBreachCheck(password) {
    const requestId = ++breachRequestId;
    window.clearTimeout(breachTimer);
    if (!password) {
      renderEmpty();
      return;
    }
    breachTimer = window.setTimeout(() => {
      renderBreachChecking();
      chrome.runtime.sendMessage({ type: "PASSBIT_CHECK_BREACH", password }, (response) => {
        if (requestId !== breachRequestId) return;
        if (chrome.runtime.lastError || !response || !response.ok) {
          setClasses(breachIcon, "metric-icon", "purple");
          breachIcon.textContent = "◇";
          breachValue.textContent = "Unavailable";
          statusText.textContent = "Local entropy is ready. The breach service could not be reached, so no breach claim is made.";
          return;
        }
        renderBreachResult(response);
      });
    }, 280);
  }

  passwordInput.addEventListener("input", () => {
    const password = passwordInput.value;
    if (!password) {
      renderEmpty();
      return;
    }
    const result = globalThis.PassBitEntropy.analyzePassword(password);
    renderLocalAnalysis(result);
    requestBreachCheck(password);
  });

  toggleButton.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    toggleButton.textContent = shouldShow ? "HIDE" : "SHOW";
    toggleButton.setAttribute("aria-label", shouldShow ? "Hide password" : "Show password");
    toggleButton.setAttribute("aria-pressed", String(shouldShow));
  });

  renderEmpty();
  passwordInput.focus();
});
