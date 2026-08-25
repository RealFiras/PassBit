"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const checkView = document.getElementById("check-view");
  const vaultView = document.getElementById("vault-view");
  const openVaultButton = document.getElementById("open-vault");
  const closeVaultButton = document.getElementById("close-vault");
  const passwordInput = document.getElementById("password-input");
  const toggleButton = document.getElementById("toggle-password");
  const lengthValue = document.getElementById("length-value");
  const typesValue = document.getElementById("types-value");
  const lengthLabel = document.getElementById("length-label");
  const typesLabel = document.getElementById("types-label");
  const resultCard = document.getElementById("result-card");
  const scoreRing = document.getElementById("score-ring");
  const scoreValue = document.getElementById("score-value");
  const resultTitle = document.getElementById("result-title");
  const resultDescription = document.getElementById("result-description");
  const breachIcon = document.getElementById("breach-icon");
  const breachValue = document.getElementById("breach-value");
  const tipLine = document.getElementById("tip-line");
  const reasonList = document.getElementById("reason-list");
  const generatorPanel = document.getElementById("generator-panel");
  const generateButton = document.getElementById("generate-password");
  const regenerateButton = document.getElementById("regenerate-generated");
  const generatedOutput = document.getElementById("generated-password");
  const copyGeneratedButton = document.getElementById("copy-generated");
  const useGeneratedButton = document.getElementById("use-generated");
  const copyFeedback = document.getElementById("copy-feedback");
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
  const favoriteNameInput = document.getElementById("favorite-name");
  const favoriteUsernameInput = document.getElementById("favorite-username");
  const saveFavoriteButton = document.getElementById("save-favorite");
  const saveFeedback = document.getElementById("save-feedback");
  const favoriteList = document.getElementById("favorite-list");
  const vaultCount = document.getElementById("vault-count");

  let breachRequestId = 0;
  let breachTimer = 0;
  let currentBand = "neutral";
  let generatedPassword = "";
  let vaultPassphrase = "";
  let favorites = [];

  function setClasses(element, ...classes) {
    if (element) element.className = classes.filter(Boolean).join(" ");
  }

  function setSaveButtonEnabled(enabled) {
    if (saveFavoriteButton) saveFavoriteButton.disabled = !enabled;
  }

  function createGeneratedPassword() {
    generatedPassword = globalThis.PassBitEntropy.generateStrongPassword();
    generatedOutput.textContent = generatedPassword;
    copyGeneratedButton.disabled = false;
    useGeneratedButton.disabled = false;
    copyFeedback.textContent = "تم توليد كلمة جديدة.";
  }

  function updateScore(value) {
    const score = Math.max(0, Math.min(100, Number(value) || 0));
    scoreValue.textContent = String(score);
    scoreRing.style.setProperty("--score", `${score * 3.6}deg`);
  }

  function showView(view) {
    const showingVault = view === "vault";
    checkView.hidden = showingVault;
    vaultView.hidden = !showingVault;
    if (showingVault) refreshVaultState();
  }

  function renderEmpty() {
    currentBand = "neutral";
    lengthValue.textContent = "0";
    typesValue.textContent = "0";
    lengthLabel.textContent = "0 حرف";
    typesLabel.textContent = "0 من 4 أنواع";
    updateScore(0);
    setClasses(resultCard, "result-card", "neutral");
    resultTitle.textContent = "بانتظار كلمة المرور";
    resultDescription.textContent = "سنحسب القوة بناءً على الطول والتنوع.";
    breachIcon.className = "breach-icon";
    breachIcon.textContent = "◇";
    breachValue.textContent = "لم يبدأ بعد";
    tipLine.textContent = "نصيحة: استخدم 14 حرفًا أو أكثر، واجعلها فريدة.";
    renderReasons([]);
    setSaveButtonEnabled(false);
  }

  function renderReasons(reasons) {
    if (!reasonList) return;
    reasonList.replaceChildren();
    const items = Array.isArray(reasons) && reasons.length ? reasons.slice(0, 5) : ["لم نكتشف نمطًا شائعًا في الفحص المحلي."];
    items.forEach((reason) => {
      const item = document.createElement("li");
      item.textContent = reason;
      reasonList.appendChild(item);
    });
  }

  function renderLocalAnalysis(result) {
    const types = Object.values(result.characterSets).filter(Boolean).length;
    currentBand = result.band.id;
    lengthValue.textContent = String(result.length);
    typesValue.textContent = String(types);
    lengthLabel.textContent = `${result.length} حرف`;
    typesLabel.textContent = `${types} من 4 أنواع`;
    updateScore(result.progressPercent);
    setClasses(resultCard, "result-card", result.band.id);
    resultTitle.textContent = `كلمة المرور ${result.band.labelAr}`;
    resultDescription.textContent = result.band.adviceAr;
    breachIcon.className = "breach-icon";
    breachIcon.textContent = "◇";
    breachValue.textContent = "جارٍ الفحص…";
    tipLine.textContent = `نصيحة: ${result.suggestionsAr[0] || "ممتاز. لا تعِد استخدام كلمة المرور."}`;
    renderReasons(result.findingsAr);
    setSaveButtonEnabled(true);
  }

  function renderBreachError() {
    breachIcon.className = "breach-icon";
    breachIcon.textContent = "◇";
    breachValue.textContent = "تعذر الفحص الآن";
    setClasses(resultCard, "result-card", "error");
    resultTitle.textContent = `القوة: ${currentBand === "strong" ? "قوية" : currentBand === "moderate" ? "متوسطة" : "ضعيفة"}`;
    resultDescription.textContent = "التقييم محسوب محليًا، لكن فحص التسريب غير متاح الآن.";
  }

  function renderBreachResult(result) {
    if (result.status === "leaked") {
      breachIcon.className = "breach-icon leaked";
      breachIcon.textContent = "!";
      breachValue.textContent = `ظهرت ${result.count.toLocaleString("ar-EG")} مرة`;
      setClasses(resultCard, "result-card", "leaked");
      resultTitle.textContent = "لا تستخدمها — ظهرت في تسريب";
      resultDescription.textContent = "غيّرها فورًا ولا تعِد استخدامها.";
      return;
    }
    if (result.status === "clean") {
      breachIcon.className = "breach-icon clean";
      breachIcon.textContent = "✓";
      breachValue.textContent = "لم تظهر في التسريبات المعروفة";
      setClasses(resultCard, "result-card", currentBand);
      resultTitle.textContent = currentBand === "strong" ? "قوية ولم تظهر في التسريبات" : `القوة ${currentBand === "moderate" ? "متوسطة" : "ضعيفة"}`;
      resultDescription.textContent = currentBand === "strong" ? "نتيجة جيدة. اجعلها فريدة دائمًا." : "لم تظهر في التسريبات، لكن حسّنها حسب النصيحة.";
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

  async function copyText(value, feedbackElement) {
    try {
      await navigator.clipboard.writeText(value);
      feedbackElement.textContent = "تم النسخ.";
      window.setTimeout(() => { feedbackElement.textContent = ""; }, 1800);
    } catch (error) {
      feedbackElement.textContent = "تعذر النسخ؛ حدّد النص يدويًا.";
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
    vaultCount.textContent = favorites.length ? `${favorites.length} محفوظة ومشفّرة` : "لا توجد كلمات محفوظة";
    favorites.forEach((favorite) => {
      const item = document.createElement("article");
      item.className = "favorite-item";
      item.dataset.id = favorite.id;

      const top = document.createElement("div");
      top.className = "favorite-top";
      const name = document.createElement("strong");
      name.className = "favorite-name";
      name.textContent = favorite.name;
      const username = document.createElement("span");
      username.className = "favorite-user";
      username.textContent = favorite.username || "بدون مستخدم";
      top.append(name, username);

      const password = document.createElement("input");
      password.className = "favorite-password";
      password.type = "password";
      password.readOnly = true;
      password.value = favorite.password;
      password.setAttribute("aria-label", `كلمة مرور ${favorite.name}`);

      const actions = document.createElement("div");
      actions.className = "favorite-actions";
      [["toggle", "إظهار"], ["copy", "نسخ"], ["delete", "حذف"]].forEach(([action, label]) => {
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
    setupFeedback.textContent = "";
    if (passphrase.length < 12) {
      setupFeedback.textContent = "استخدم 12 حرفًا على الأقل.";
      return;
    }
    if (passphrase !== setupConfirm.value) {
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
      await refreshVaultState();
    } catch (error) {
      setupFeedback.textContent = "تعذر إنشاء الخزنة.";
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
      favorites = await globalThis.PassBitVault.decryptRecords(passphrase, await readVaultEnvelope());
      vaultPassphrase = passphrase;
      unlockPassphrase.value = "";
      await refreshVaultState();
    } catch (error) {
      unlockFeedback.textContent = "العبارة غير صحيحة.";
    } finally {
      unlockButton.disabled = false;
    }
  }

  function lockVault() {
    vaultPassphrase = "";
    favorites = [];
    refreshVaultState();
  }

  async function saveFavorite() {
    saveFeedback.textContent = "";
    if (!vaultPassphrase) {
      saveFeedback.textContent = "افتح الخزنة أولًا.";
      return;
    }
    const name = favoriteNameInput.value.trim();
    if (!name || !passwordInput.value) {
      saveFeedback.textContent = "اكتب اسم الخدمة وافحص كلمة المرور أولًا.";
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
    try {
      await globalThis.PassBitVault.saveRecords(vaultPassphrase, favorites);
      favoriteNameInput.value = "";
      favoriteUsernameInput.value = "";
      saveFeedback.textContent = "تم الحفظ مشفّرًا.";
      renderVaultFavorites();
    } catch (error) {
      saveFeedback.textContent = "تعذر الحفظ.";
    }
  }

  async function handleFavoriteAction(event) {
    const button = event.target.closest("button[data-favorite-action]");
    if (!button) return;
    const item = button.closest(".favorite-item");
    const favorite = favorites.find((entry) => entry.id === item?.dataset.id);
    if (!favorite) return;
    if (button.dataset.favoriteAction === "toggle") {
      const field = item.querySelector(".favorite-password");
      const showing = field.type === "text";
      field.type = showing ? "password" : "text";
      button.textContent = showing ? "إظهار" : "إخفاء";
      return;
    }
    if (button.dataset.favoriteAction === "copy") {
      await copyText(favorite.password, button);
      return;
    }
    if (button.dataset.favoriteAction === "delete" && window.confirm(`حذف ${favorite.name}؟`)) {
      favorites = favorites.filter((entry) => entry.id !== favorite.id);
      await globalThis.PassBitVault.saveRecords(vaultPassphrase, favorites);
      renderVaultFavorites();
    }
  }

  async function deleteVault() {
    if (!window.confirm("حذف الخزنة وكل كلماتها نهائيًا؟")) return;
    await globalThis.PassBitVault.deleteVault();
    vaultPassphrase = "";
    favorites = [];
    setupFeedback.textContent = "تم حذف الخزنة.";
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
  openVaultButton.addEventListener("click", () => showView("vault"));
  closeVaultButton.addEventListener("click", () => showView("check"));
  generateButton.setAttribute("aria-expanded", "false");
  generateButton.addEventListener("click", () => {
    const opening = generatorPanel.hidden;
    if (opening && !generatedPassword) createGeneratedPassword();
    generatorPanel.hidden = !opening;
    generateButton.setAttribute("aria-expanded", String(opening));
    generateButton.querySelector("strong").textContent = opening ? "إخفاء المولّد" : "توليد كلمة مرور قوية";
  });
  regenerateButton.addEventListener("click", () => {
    createGeneratedPassword();
    generatorPanel.hidden = false;
    generateButton.setAttribute("aria-expanded", "true");
  });
  copyGeneratedButton.addEventListener("click", () => copyText(generatedPassword, copyFeedback));
  useGeneratedButton.addEventListener("click", () => {
    passwordInput.value = generatedPassword;
    passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    showView("check");
  });
  setupButton.addEventListener("click", setupVault);
  unlockButton.addEventListener("click", unlockVault);
  lockButton.addEventListener("click", lockVault);
  deleteVaultButton.addEventListener("click", deleteVault);
  if (saveFavoriteButton) saveFavoriteButton.addEventListener("click", saveFavorite);
  favoriteList.addEventListener("click", handleFavoriteAction);

  renderEmpty();
  refreshVaultState();
  passwordInput.focus();
});
