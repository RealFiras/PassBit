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
  const favoriteNameInput = document.getElementById("favorite-name");
  const favoriteUsernameInput = document.getElementById("favorite-username");
  const saveFavoriteButton = document.getElementById("save-favorite");
  const saveFeedback = document.getElementById("save-feedback");
  const setupSection = document.getElementById("vault-setup");
  const lockedSection = document.getElementById("vault-locked");
  const unlockedSection = document.getElementById("vault-unlocked");
  const setupPassphrase = document.getElementById("setup-passphrase");
  const setupConfirm = document.getElementById("setup-confirm");
  const setupButton = document.getElementById("setup-vault");
  const setupFeedback = document.getElementById("setup-feedback");
  const unlockPassphrase = document.getElementById("unlock-passphrase");
  const unlockButton = document.getElementById("unlock-vault");
  const unlockFeedback = document.getElementById("unlock-feedback");
  const lockButton = document.getElementById("lock-vault");
  const deleteVaultButton = document.getElementById("delete-vault");
  const favoriteList = document.getElementById("favorite-list");
  const vaultCount = document.getElementById("vault-count");
  const tabButtons = Array.from(document.querySelectorAll(".tab[data-tab]"));
  const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

  let breachRequestId = 0;
  let breachTimer = 0;
  let currentBand = "neutral";
  let generatedPassword = "";
  let vaultPassphrase = "";
  let favorites = [];

  function setClasses(element, ...classes) {
    element.className = classes.filter(Boolean).join(" ");
  }

  function showTab(tabId) {
    tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
    tabPanels.forEach((panel) => { panel.hidden = panel.id !== tabId; });
    if (tabId === "favorites-view") refreshVaultState();
  }

  function renderSuggestions(suggestions) {
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
    suggestionsList.replaceChildren();
    suggestionCount.textContent = String(safeSuggestions.length);
    if (safeSuggestions.length === 0) {
      const item = document.createElement("li");
      item.className = "empty-suggestion";
      item.textContent = "لا توجد اقتراحات إضافية.";
      suggestionsList.appendChild(item);
      return;
    }
    safeSuggestions.slice(0, 5).forEach((suggestion) => {
      const item = document.createElement("li");
      item.textContent = suggestion;
      suggestionsList.appendChild(item);
    });
  }

  function updateSaveButton() {
    saveFavoriteButton.disabled = !passwordInput.value;
  }

  function renderEmpty() {
    currentBand = "neutral";
    entropyValue.textContent = "0.0";
    poolValue.textContent = "0";
    lengthLabel.textContent = "لم تكتب شيئًا بعد";
    setClasses(resultCard, "result-card", "neutral");
    resultIcon.textContent = "؟";
    resultTitle.textContent = "جاهز للفحص";
    resultDescription.textContent = "اكتب كلمة المرور لترى النتيجة.";
    setClasses(strengthBadge, "strength-badge", "neutral");
    strengthBadge.textContent = "—";
    breachIcon.className = "breach-symbol";
    breachIcon.textContent = "◇";
    breachValue.textContent = "بانتظار الإدخال";
    renderSuggestions([]);
    updateSaveButton();
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
    updateSaveButton();
  }

  function renderBreachError() {
    breachIcon.className = "breach-symbol";
    breachIcon.textContent = "◇";
    breachValue.textContent = "تعذر الاتصال بالخدمة";
    setClasses(resultCard, "result-card", "error");
    resultIcon.textContent = "!";
    resultTitle.textContent = `تحليل القوة: ${currentBand === "strong" ? "قوية" : currentBand === "moderate" ? "متوسطة" : "ضعيفة"}`;
    resultDescription.textContent = "تعذر فحص التسريبات الآن. لم نعتبرها نظيفة.";
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
        ? "هذه إشارة جيدة وليست ضمانًا كاملًا. اجعلها فريدة دائمًا."
        : "لم نجدها في قاعدة التسريبات، لكن طبّق الاقتراحات لتحسينها.";
      return;
    }
    renderBreachError();
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
      copyFeedback.textContent = "تم النسخ.";
      window.setTimeout(() => { copyFeedback.textContent = ""; }, 2200);
    } catch (error) {
      copyFeedback.textContent = "تعذر النسخ؛ حدّد النص يدويًا.";
    }
  }

  async function readVaultEnvelope() {
    try {
      return await globalThis.PassBitVault.readEnvelope();
    } catch (error) {
      return null;
    }
  }

  function renderVaultFavorites() {
    favoriteList.replaceChildren();
    vaultCount.textContent = favorites.length === 0 ? "لا توجد كلمات محفوظة." : `${favorites.length} محفوظة ومشفّرة`;
    favorites.forEach((favorite) => {
      const item = document.createElement("article");
      item.className = "favorite-item";
      item.dataset.id = favorite.id;

      const top = document.createElement("div");
      top.className = "favorite-top";
      const title = document.createElement("span");
      title.className = "favorite-name";
      title.textContent = favorite.name;
      const user = document.createElement("span");
      user.className = "favorite-user";
      user.textContent = favorite.username || "بدون اسم مستخدم";
      top.append(title, user);

      const password = document.createElement("input");
      password.className = "favorite-password";
      password.type = "password";
      password.readOnly = true;
      password.value = favorite.password;
      password.setAttribute("aria-label", `كلمة مرور ${favorite.name}`);

      const actions = document.createElement("div");
      actions.className = "favorite-actions";
      [
        ["toggle", "إظهار"],
        ["copy", "نسخ"],
        ["delete", "حذف"],
      ].forEach(([action, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = action === "delete" ? "danger-button" : "secondary-button";
        button.dataset.favoriteAction = action;
        button.textContent = label;
        actions.appendChild(button);
      });

      item.append(top, password, actions);
      favoriteList.appendChild(item);
    });
  }

  async function refreshVaultState() {
    const envelope = await readVaultEnvelope();
    const hasVault = Boolean(envelope);
    setupSection.hidden = hasVault;
    lockedSection.hidden = !hasVault || Boolean(vaultPassphrase);
    unlockedSection.hidden = !hasVault || !vaultPassphrase;
    if (vaultPassphrase) renderVaultFavorites();
  }

  async function setupVault() {
    const passphrase = setupPassphrase.value;
    const confirmation = setupConfirm.value;
    setupFeedback.textContent = "";
    if (passphrase.length < 12) {
      setupFeedback.textContent = "استخدم عبارة من 12 حرفًا على الأقل.";
      return;
    }
    if (passphrase !== confirmation) {
      setupFeedback.textContent = "العبارتان غير متطابقتين.";
      return;
    }
    setupButton.disabled = true;
    try {
      await globalThis.PassBitVault.saveRecords(passphrase, []);
      vaultPassphrase = passphrase;
      favorites = [];
      setupPassphrase.value = "";
      setupConfirm.value = "";
      setupFeedback.textContent = "تم إنشاء الخزنة.";
      await refreshVaultState();
    } catch (error) {
      setupFeedback.textContent = "تعذر إنشاء الخزنة. حاول مرة أخرى.";
    } finally {
      setupButton.disabled = false;
    }
  }

  async function unlockVault() {
    const passphrase = unlockPassphrase.value;
    unlockFeedback.textContent = "";
    if (passphrase.length < 12) {
      unlockFeedback.textContent = "أدخل العبارة الرئيسية كاملة.";
      return;
    }
    unlockButton.disabled = true;
    try {
      const envelope = await readVaultEnvelope();
      favorites = await globalThis.PassBitVault.decryptRecords(passphrase, envelope);
      vaultPassphrase = passphrase;
      unlockPassphrase.value = "";
      await refreshVaultState();
    } catch (error) {
      unlockFeedback.textContent = "العبارة غير صحيحة أو الخزنة تالفة.";
    } finally {
      unlockButton.disabled = false;
    }
  }

  function lockVault() {
    vaultPassphrase = "";
    favorites = [];
    unlockPassphrase.value = "";
    refreshVaultState();
  }

  async function saveFavorite() {
    saveFeedback.textContent = "";
    if (!passwordInput.value) return;
    if (!vaultPassphrase) {
      saveFeedback.textContent = "افتح تبويب المفضلة وأنشئ أو افتح خزنتك أولًا.";
      showTab("favorites-view");
      return;
    }
    const name = favoriteNameInput.value.trim();
    if (!name) {
      saveFeedback.textContent = "اكتب اسم الخدمة أولًا.";
      favoriteNameInput.focus();
      return;
    }
    const record = {
      id: globalThis.PassBitVault.createId(),
      name,
      username: favoriteUsernameInput.value.trim(),
      password: passwordInput.value,
      createdAt: Date.now(),
    };
    favorites = [record, ...favorites].slice(0, globalThis.PassBitVault.MAX_RECORDS);
    saveFavoriteButton.disabled = true;
    try {
      await globalThis.PassBitVault.saveRecords(vaultPassphrase, favorites);
      favoriteNameInput.value = "";
      favoriteUsernameInput.value = "";
      saveFeedback.textContent = "تم الحفظ داخل الخزنة المشفّرة.";
    } catch (error) {
      saveFeedback.textContent = "تعذر الحفظ. لم يتم تغيير الخزنة.";
    } finally {
      updateSaveButton();
    }
  }

  async function handleFavoriteAction(event) {
    const button = event.target.closest("button[data-favorite-action]");
    if (!button) return;
    const item = button.closest(".favorite-item");
    if (!item) return;
    const favorite = favorites.find((entry) => entry.id === item.dataset.id);
    if (!favorite) return;

    if (button.dataset.favoriteAction === "toggle") {
      const password = item.querySelector(".favorite-password");
      const showing = password.type === "text";
      password.type = showing ? "password" : "text";
      button.textContent = showing ? "إظهار" : "إخفاء";
      return;
    }
    if (button.dataset.favoriteAction === "copy") {
      try {
        await navigator.clipboard.writeText(favorite.password);
        button.textContent = "تم النسخ";
        window.setTimeout(() => { button.textContent = "نسخ"; }, 1800);
      } catch (error) {
        button.textContent = "تعذر النسخ";
      }
      return;
    }
    if (button.dataset.favoriteAction === "delete") {
      if (!window.confirm(`حذف ${favorite.name} من الخزنة؟`)) return;
      favorites = favorites.filter((entry) => entry.id !== favorite.id);
      await globalThis.PassBitVault.saveRecords(vaultPassphrase, favorites);
      renderVaultFavorites();
    }
  }

  async function deleteVault() {
    if (!window.confirm("سيتم حذف الخزنة وكل كلماتها نهائيًا. هل تريد المتابعة؟")) return;
    await globalThis.PassBitVault.deleteVault();
    vaultPassphrase = "";
    favorites = [];
    setupFeedback.textContent = "تم حذف الخزنة والبيانات.";
    await refreshVaultState();
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

  tabButtons.forEach((button) => button.addEventListener("click", () => showTab(button.dataset.tab)));
  generateButton.addEventListener("click", () => {
    generatedPassword = globalThis.PassBitEntropy.generateStrongPassword();
    generatedOutput.textContent = generatedPassword;
    copyGeneratedButton.disabled = false;
    useGeneratedButton.disabled = false;
    copyFeedback.textContent = "تم التوليد داخل المتصفح.";
    window.setTimeout(() => { copyFeedback.textContent = ""; }, 2200);
  });
  copyGeneratedButton.addEventListener("click", copyGeneratedPassword);
  useGeneratedButton.addEventListener("click", () => {
    if (!generatedPassword) return;
    passwordInput.value = generatedPassword;
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    passwordInput.focus();
  });
  saveFavoriteButton.addEventListener("click", saveFavorite);
  setupButton.addEventListener("click", setupVault);
  unlockButton.addEventListener("click", unlockVault);
  lockButton.addEventListener("click", lockVault);
  deleteVaultButton.addEventListener("click", deleteVault);
  favoriteList.addEventListener("click", handleFavoriteAction);

  renderEmpty();
  refreshVaultState();
  passwordInput.focus();
});
