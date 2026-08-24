"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const passwordInput = document.getElementById("password-input");
  const toggleButton = document.getElementById("toggle-password");
  const entropyValue = document.getElementById("entropy-value");
  const poolValue = document.getElementById("pool-value");
  const lengthLabel = document.getElementById("length-label");
  const resultCard = document.getElementById("result-card");
  const resultIcon = document.getElementById("result-icon");
  const resultTitle = document.getElementById("result-title");
  const resultDescription = document.getElementById("result-description");
  const strengthBadge = document.getElementById("strength-badge");
  const breachIcon = document.getElementById("breach-icon");
  const breachValue = document.getElementById("breach-value");
  const suggestionsList = document.getElementById("suggestions-list");
  const suggestionCount = document.getElementById("suggestion-count");
  const generateButton = document.getElementById("generate-password");
  const generatedOutput = document.getElementById("generated-password");
  const copyGeneratedButton = document.getElementById("copy-generated");
  const useGeneratedButton = document.getElementById("use-generated");
  const copyFeedback = document.getElementById("copy-feedback");

  let breachRequestId = 0;
  let breachTimer = 0;
  let currentBand = "neutral";
  let generatedPassword = "";

  function setClasses(element, ...classes) {
    element.className = classes.filter(Boolean).join(" ");
  }

  function renderSuggestions(suggestions) {
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
    suggestionsList.replaceChildren();
    suggestionCount.textContent = String(safeSuggestions.length);
    if (safeSuggestions.length === 0) {
      const item = document.createElement("li");
      item.className = "empty-suggestion";
      item.textContent = "لا توجد اقتراحات إضافية لهذا الفحص.";
      suggestionsList.appendChild(item);
      return;
    }
    safeSuggestions.slice(0, 5).forEach((suggestion) => {
      const item = document.createElement("li");
      item.textContent = suggestion;
      suggestionsList.appendChild(item);
    });
  }

  function renderEmpty() {
    currentBand = "neutral";
    entropyValue.textContent = "0.0";
    poolValue.textContent = "0";
    lengthLabel.textContent = "لم تكتب شيئًا بعد";
    setClasses(resultCard, "result-card", "neutral");
    resultIcon.textContent = "؟";
    resultTitle.textContent = "ابدأ بكتابة كلمة المرور";
    resultDescription.textContent = "لن نرسل كلمة المرور نفسها. سيظهر هنا قرار واضح ومختصر.";
    setClasses(strengthBadge, "strength-badge", "neutral");
    strengthBadge.textContent = "—";
    breachIcon.className = "breach-symbol";
    breachIcon.textContent = "◇";
    breachValue.textContent = "بانتظار الإدخال";
    renderSuggestions([]);
  }

  function renderLocalAnalysis(result) {
    currentBand = result.band.id;
    entropyValue.textContent = result.entropyBits.toFixed(1);
    poolValue.textContent = String(result.poolSize);
    lengthLabel.textContent = `${result.length} ${result.length === 1 ? "حرف" : "أحرف"}`;
    setClasses(resultCard, "result-card", result.band.id);
    resultIcon.textContent = result.band.id === "strong" ? "✓" : result.band.id === "moderate" ? "!" : "×";
    resultTitle.textContent = `كلمة المرور ${result.band.labelAr}`;
    resultDescription.textContent = result.band.adviceAr;
    setClasses(strengthBadge, "strength-badge", result.band.id);
    strengthBadge.textContent = result.band.labelAr;
    breachIcon.className = "breach-symbol";
    breachIcon.textContent = "◇";
    breachValue.textContent = "جارٍ الفحص…";
    renderSuggestions(result.suggestionsAr);
  }

  function renderBreachResult(result) {
    if (result.status === "leaked") {
      breachIcon.className = "breach-symbol leaked";
      breachIcon.textContent = "!";
      breachValue.textContent = `ظهرت ${result.count.toLocaleString("ar-EG")} مرة`;
      setClasses(resultCard, "result-card", "leaked");
      resultIcon.textContent = "!";
      resultTitle.textContent = "لا تستخدمها — ظهرت في تسريب";
      resultDescription.textContent = "غيّرها فورًا في كل حساب استخدمتها فيه، ولا تعِد استخدامها.";
      return;
    }
    if (result.status === "clean") {
      breachIcon.className = "breach-symbol clean";
      breachIcon.textContent = "✓";
      breachValue.textContent = "لم تظهر في التسريبات المعروفة";
      const cardState = currentBand === "strong" ? "clean" : currentBand;
      setClasses(resultCard, "result-card", cardState);
      resultIcon.textContent = currentBand === "strong" ? "✓" : "!";
      resultTitle.textContent = currentBand === "strong" ? "ممتاز — لم تظهر في التسريبات" : "لم تظهر في التسريبات، لكنها تحتاج تحسينًا";
      resultDescription.textContent = currentBand === "strong"
        ? "هذه إشارة جيدة، لكنها ليست ضمانًا كاملًا. اجعلها فريدة دائمًا."
        : "لم نجدها في قاعدة التسريبات المفحوصة، لكن زِد طولها وتنوعها قبل الاعتماد عليها.";
      return;
    }
    renderBreachError();
  }

  function renderBreachError() {
    breachIcon.className = "breach-symbol";
    breachIcon.textContent = "◇";
    breachValue.textContent = "تعذر الاتصال بالخدمة";
    setClasses(resultCard, "result-card", "error");
    resultIcon.textContent = "!";
    resultTitle.textContent = `تحليل القوة: ${currentBand === "strong" ? "قوية" : currentBand === "moderate" ? "متوسطة" : "ضعيفة"}`;
    resultDescription.textContent = "تعذر فحص التسريبات الآن. لم نعتبرها نظيفة، ويمكنك المحاولة مرة أخرى لاحقًا.";
  }

  function requestBreachCheck(password) {
    const requestId = ++breachRequestId;
    window.clearTimeout(breachTimer);
    if (!password) {
      renderEmpty();
      return;
    }
    breachTimer = window.setTimeout(() => {
      breachIcon.className = "breach-symbol";
      breachIcon.textContent = "…";
      breachValue.textContent = "جارٍ فحص التسريبات…";
      chrome.runtime.sendMessage({ type: "PASSBIT_CHECK_BREACH", password }, (response) => {
        if (requestId !== breachRequestId) return;
        if (chrome.runtime.lastError || !response || !response.ok) {
          renderBreachError();
          return;
        }
        renderBreachResult(response);
      });
    }, 280);
  }

  async function copyGeneratedPassword() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      copyFeedback.textContent = "تم النسخ إلى الحافظة.";
      window.setTimeout(() => { copyFeedback.textContent = ""; }, 2500);
    } catch (error) {
      copyFeedback.textContent = "تعذر النسخ؛ حدّد النص يدويًا.";
    }
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
    const showPassword = passwordInput.type === "password";
    passwordInput.type = showPassword ? "text" : "password";
    toggleButton.textContent = showPassword ? "إخفاء" : "إظهار";
    toggleButton.setAttribute("aria-label", showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور");
    toggleButton.setAttribute("aria-pressed", String(showPassword));
  });

  generateButton.addEventListener("click", () => {
    generatedPassword = globalThis.PassBitEntropy.generateStrongPassword();
    generatedOutput.textContent = generatedPassword;
    copyGeneratedButton.disabled = false;
    useGeneratedButton.disabled = false;
    copyFeedback.textContent = "تم التوليد داخل المتصفح.";
    window.setTimeout(() => { copyFeedback.textContent = ""; }, 2500);
  });

  copyGeneratedButton.addEventListener("click", copyGeneratedPassword);

  useGeneratedButton.addEventListener("click", () => {
    if (!generatedPassword) return;
    passwordInput.value = generatedPassword;
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    passwordInput.focus();
  });

  renderEmpty();
  passwordInput.focus();
});
