"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const checkView = document.getElementById("check-view");
  const vaultView = document.getElementById("vault-view");
  const openVaultButton = document.getElementById("open-vault");
  const closeVaultButton = document.getElementById("close-vault");
  const passwordInput = document.getElementById("password-input");
  const toggleButton = document.getElementById("toggle-password");
  const toggleLabel = toggleButton.querySelector(".action-label");
  const copyInputButton = document.getElementById("copy-input");
  const inputFeedback = document.getElementById("input-feedback");
  const lengthValue = document.getElementById("length-value");
  const typesValue = document.getElementById("types-value");
  const lengthLabel = document.getElementById("length-label");
  const typesLabel = document.getElementById("types-label");
  const resultCard = document.getElementById("result-card");
  const scoreRing = document.getElementById("score-ring");
  const scoreSegments = scoreRing.querySelectorAll(".score-segment");
  const scoreValue = document.getElementById("score-value");
  const scoreMeta = document.getElementById("score-meta");
  const resultTitle = document.getElementById("result-title");
  const resultDescription = document.getElementById("result-description");
  const breachIcon = document.getElementById("breach-icon");
  const breachValue = document.getElementById("breach-value");
  const retryBreachButton = document.getElementById("retry-breach");
  const tipLine = document.getElementById("tip-line");
  const reasonList = document.getElementById("reason-list");
  const generatorPanel = document.getElementById("generator-panel");
  const generateButton = document.getElementById("generate-password");
  const regenerateButton = document.getElementById("regenerate-generated");
  const generatedOutput = document.getElementById("generated-password");
  const generatedTypeLabel = document.getElementById("generated-type-label");
  const copyGeneratedButton = document.getElementById("copy-generated");
  const useGeneratedButton = document.getElementById("use-generated");
  const copyFeedback = document.getElementById("copy-feedback");
  const modePasswordButton = document.getElementById("mode-password");
  const modePassphraseButton = document.getElementById("mode-passphrase");
  const passwordOptions = document.getElementById("password-options");
  const passphraseOptions = document.getElementById("passphrase-options");
  const passwordLength = document.getElementById("password-length");
  const passphraseCount = document.getElementById("passphrase-count");
  const passphraseSeparator = document.getElementById("passphrase-separator");
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
  const favoriteSearch = document.getElementById("favorite-search");
  const favoriteSort = document.getElementById("favorite-sort");
  const vaultCount = document.getElementById("vault-count");
  const vaultTimeout = document.getElementById("vault-timeout");
  const exportVaultButton = document.getElementById("export-vault");
  const importVaultButton = document.getElementById("import-vault");
  const importVaultFile = document.getElementById("import-vault-file");
  const transferFeedback = document.getElementById("transfer-feedback");
  const previewVaultButtons = document.querySelectorAll("[data-open-vault]");

  let breachRequestId = 0;
  let breachTimer = 0;
  let vaultLockTimer = 0;
  let currentBand = "neutral";
  let currentPasswordForBreach = "";
  let generatedPassword = "";
  let generatorMode = "password";
  let vaultPassphrase = "";
  let favorites = [];

  function setClasses(element, ...classes) {
    if (element) element.className = classes.filter(Boolean).join(" ");
  }

  function setSaveButtonEnabled(enabled) {
    if (saveFavoriteButton) saveFavoriteButton.disabled = !enabled;
  }

  function setRetryVisible(visible) {
    if (retryBreachButton) retryBreachButton.hidden = !visible;
  }

  function setBreachIcon(state = "neutral") {
    const icons = {
      neutral: '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 8v5m0 3h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
      clean: '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m8.4 12.2 2.3 2.3 4.9-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      leaked: '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 4 20 19H4L12 4Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 9v5m0 2.5h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    };
    const iconState = icons[state] ? state : "neutral";
    breachIcon.className = `breach-icon ${iconState === "neutral" ? "" : iconState}`.trim();
    breachIcon.innerHTML = icons[iconState];
  }

  function updateScore(value) {
    const score = Math.max(0, Math.min(100, Number(value) || 0));
    scoreValue.textContent = String(score);
    scoreRing.style.setProperty("--score", `${score * 3.6}deg`);
    scoreRing.style.setProperty("--score-percent", `${score}%`);
    const thresholds = [25, 50, 75, 100];
    scoreSegments.forEach((segment, index) => segment.classList.toggle("active", score >= thresholds[index]));
  }

  function renderEmpty() {
    currentBand = "neutral";
    currentPasswordForBreach = "";
    window.clearTimeout(breachTimer);
    lengthValue.textContent = "0";
    typesValue.textContent = "0/4";
    lengthLabel.textContent = "0 حرف";
    typesLabel.textContent = "0 من 4 أنواع";
    updateScore(0);
    setClasses(resultCard, "result-card", "neutral");
    resultTitle.textContent = "بانتظار كلمة المرور";
    resultDescription.textContent = "سنحسب القوة بناءً على الطول والتنوع.";
    scoreMeta.textContent = "تقدير محلي محسّن";
    setBreachIcon("neutral");
    breachValue.textContent = "لم يبدأ بعد";
    setRetryVisible(false);
    tipLine.textContent = "نصيحة: استخدم 14 حرفًا أو أكثر، واجعلها فريدة.";
    inputFeedback.textContent = "";
    renderReasons([]);
    setSaveButtonEnabled(false);
  }

  function renderReasons(reasons) {
    if (!reasonList) return;
    reasonList.replaceChildren();
    const items = Array.isArray(reasons) && reasons.length ? reasons.slice(0, 6) : ["لم نكتشف نمطًا شائعًا في الفحص المحلي."];
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
    typesValue.textContent = `${types}/4`;
    lengthLabel.textContent = `${result.length} حرف`;
    typesLabel.textContent = `${types} من 4 أنواع`;
    updateScore(result.progressPercent);
    setClasses(resultCard, "result-card", result.band.id);
    resultTitle.textContent = `كلمة المرور ${result.band.labelAr}`;
    resultDescription.textContent = result.band.adviceAr;
    scoreMeta.textContent = result.patternPenaltyBits > 0
      ? `تقدير محسّن · خُصم ${result.patternPenaltyBits} بت بسبب أنماط واضحة`
      : "تقدير محلي محسّن · لا توجد خصومات نمطية";
    setBreachIcon("neutral");
    breachValue.textContent = "جارٍ الفحص…";
    setRetryVisible(false);
    tipLine.textContent = `نصيحة: ${result.primarySuggestionAr}`;
    inputFeedback.textContent = "";
    renderReasons(result.findingsAr);
    setSaveButtonEnabled(true);
  }

  function breachErrorMessage(status) {
    const messages = {
      network_error: "لا يوجد اتصال بالشبكة الآن. التقييم المحلي متاح.",
      timeout: "انتهت مهلة الاتصال. لم نعتبر كلمة المرور نظيفة.",
      rate_limited: "الخدمة طلبت الانتظار قليلًا. حاول إعادة الفحص لاحقًا.",
      service_unavailable: "خدمة فحص التسريبات غير متاحة مؤقتًا.",
      http_error: "تعذر الوصول إلى خدمة فحص التسريبات.",
      invalid_response: "تعذر قراءة استجابة خدمة التسريبات.",
      invalid_input: "المدخل طويل جدًا لإجراء الفحص بأمان.",
    };
    return messages[status] || "تعذر فحص التسريبات الآن. لم نعتبر كلمة المرور نظيفة.";
  }

  function renderBreachError(status = "network_error") {
    setBreachIcon("neutral");
    breachValue.textContent = breachErrorMessage(status);
    setRetryVisible(status !== "invalid_input");
    setClasses(resultCard, "result-card", "error");
    resultTitle.textContent = `القوة: ${currentBand === "strong" ? "قوية" : currentBand === "moderate" ? "متوسطة" : "ضعيفة"}`;
    resultDescription.textContent = "التقييم محسوب محليًا، لكن فحص التسريب غير متاح الآن.";
  }

  function renderBreachResult(result) {
    setRetryVisible(false);
    if (result.status === "leaked") {
      setBreachIcon("leaked");
      breachValue.textContent = `ظهرت ${result.count.toLocaleString("ar-EG")} مرة`;
      setClasses(resultCard, "result-card", "leaked");
      resultTitle.textContent = "لا تستخدمها — ظهرت في تسريب";
      resultDescription.textContent = "غيّرها فورًا ولا تعِد استخدامها.";
      return;
    }
    if (result.status === "clean") {
      setBreachIcon("clean");
      breachValue.textContent = "لم تظهر في التسريبات المعروفة";
      setClasses(resultCard, "result-card", currentBand);
      resultTitle.textContent = currentBand === "strong" ? "قوية ولم تظهر في التسريبات" : `القوة ${currentBand === "moderate" ? "متوسطة" : "ضعيفة"}`;
      resultDescription.textContent = currentBand === "strong" ? "نتيجة جيدة. اجعلها فريدة دائمًا." : "لم تظهر في التسريبات، لكن حسّنها حسب النصيحة.";
      return;
    }
    renderBreachError(result.status);
  }

  function requestBreachCheck(password, immediate = false) {
    const requestId = ++breachRequestId;
    currentPasswordForBreach = password;
    window.clearTimeout(breachTimer);
    setRetryVisible(false);
    if (!password) {
      renderEmpty();
      return;
    }
    const run = () => {
      chrome.runtime.sendMessage({ type: "PASSBIT_CHECK_BREACH", password }, (response) => {
        if (requestId !== breachRequestId) return;
        if (chrome.runtime.lastError || !response || !response.ok) {
          renderBreachError(response?.status || "network_error");
          return;
        }
        renderBreachResult(response);
      });
    };
    breachTimer = window.setTimeout(run, immediate ? 0 : 280);
  }

  async function copyText(value, feedbackElement, defaultText = "") {
    try {
      await navigator.clipboard.writeText(value);
      feedbackElement.textContent = "تم النسخ.";
      window.setTimeout(() => { feedbackElement.textContent = defaultText; }, 1800);
    } catch (error) {
      feedbackElement.textContent = "تعذر النسخ؛ حدّد النص يدويًا.";
    }
  }

  function createGeneratedValue() {
    if (generatorMode === "passphrase") {
      generatedPassword = globalThis.PassBitEntropy.generatePassphrase(Number(passphraseCount.value), passphraseSeparator.value);
      generatedTypeLabel.textContent = "عبارة مرور من كلمات عشوائية محلية.";
    } else {
      generatedPassword = globalThis.PassBitEntropy.generateStrongPassword(Number(passwordLength.value));
      generatedTypeLabel.textContent = `كلمة عشوائية بطول ${generatedPassword.length} حرفًا مع تنوع الأحرف.`;
    }
    generatedOutput.textContent = generatedPassword;
    copyGeneratedButton.disabled = false;
    useGeneratedButton.disabled = false;
    copyFeedback.textContent = "تم التوليد محليًا.";
  }

  function setGeneratorMode(mode) {
    generatorMode = mode === "passphrase" ? "passphrase" : "password";
    const passphrase = generatorMode === "passphrase";
    modePasswordButton.classList.toggle("active", !passphrase);
    modePassphraseButton.classList.toggle("active", passphrase);
    modePasswordButton.setAttribute("aria-selected", String(!passphrase));
    modePassphraseButton.setAttribute("aria-selected", String(passphrase));
    passwordOptions.hidden = passphrase;
    passphraseOptions.hidden = !passphrase;
    createGeneratedValue();
  }

  async function readVaultEnvelope() {
    try {
      return await globalThis.PassBitVault.readEnvelope();
    } catch (error) {
      return null;
    }
  }

  function getVisibleFavorites() {
    const query = favoriteSearch.value.trim().toLocaleLowerCase();
    const visible = favorites.filter((favorite) => !query || `${favorite.name} ${favorite.username}`.toLocaleLowerCase().includes(query));
    if (favoriteSort.value === "name") visible.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    else visible.sort((a, b) => b.createdAt - a.createdAt);
    return visible;
  }

  function renderVaultFavorites() {
    const visibleFavorites = getVisibleFavorites();
    favoriteList.replaceChildren();
    vaultCount.textContent = visibleFavorites.length === favorites.length
      ? `${favorites.length} محفوظة ومشفّرة`
      : `${visibleFavorites.length} من ${favorites.length} محفوظة`;
    if (!visibleFavorites.length) {
      const empty = document.createElement("p");
      empty.className = "vault-empty";
      empty.textContent = favorites.length ? "لا توجد نتيجة لهذا البحث." : "لا توجد كلمات محفوظة بعد.";
      favoriteList.appendChild(empty);
      return;
    }
    visibleFavorites.forEach((favorite) => {
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

  function scheduleVaultLock() {
    window.clearTimeout(vaultLockTimer);
    const delay = Number(vaultTimeout.value) || 0;
    if (!vaultPassphrase || delay <= 0) return;
    vaultLockTimer = window.setTimeout(() => {
      vaultPassphrase = "";
      favorites = [];
      refreshVaultState();
    }, delay);
  }

  async function refreshVaultState() {
    const envelope = await readVaultEnvelope();
    const hasVault = Boolean(envelope);
    setupSection.hidden = hasVault;
    lockedSection.hidden = !hasVault || Boolean(vaultPassphrase);
    unlockedSection.hidden = !hasVault || !vaultPassphrase;
    if (vaultPassphrase) {
      renderVaultFavorites();
      scheduleVaultLock();
    }
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
      unlockFeedback.textContent = "العبارة غير صحيحة أو الملف غير صالح.";
    } finally {
      unlockButton.disabled = false;
    }
  }

  function lockVault() {
    window.clearTimeout(vaultLockTimer);
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
    const record = { id: globalThis.PassBitVault.createId(), name, username: favoriteUsernameInput.value.trim(), password: passwordInput.value, createdAt: Date.now() };
    favorites = [record, ...favorites].slice(0, globalThis.PassBitVault.MAX_RECORDS);
    try {
      await globalThis.PassBitVault.saveRecords(vaultPassphrase, favorites);
      favoriteNameInput.value = "";
      favoriteUsernameInput.value = "";
      saveFeedback.textContent = "تم الحفظ مشفّرًا.";
      renderVaultFavorites();
      scheduleVaultLock();
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
    scheduleVaultLock();
    if (button.dataset.favoriteAction === "toggle") {
      const field = item.querySelector(".favorite-password");
      const showing = field.type === "text";
      field.type = showing ? "password" : "text";
      button.textContent = showing ? "إظهار" : "إخفاء";
      return;
    }
    if (button.dataset.favoriteAction === "copy") {
      await copyText(favorite.password, button, "نسخ");
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
    lockVault();
    setupFeedback.textContent = "تم حذف الخزنة.";
    await refreshVaultState();
  }

  async function exportVault() {
    transferFeedback.textContent = "";
    const envelope = await readVaultEnvelope();
    if (!envelope || !globalThis.PassBitVault.validateEnvelope(envelope)) {
      transferFeedback.textContent = "لا توجد خزنة صالحة للتصدير.";
      return;
    }
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "passbit-encrypted-vault.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    transferFeedback.textContent = "تم تصدير الغلاف المشفّر فقط.";
  }

  async function importVaultFileContents() {
    transferFeedback.textContent = "";
    const file = importVaultFile.files?.[0];
    importVaultFile.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) {
      transferFeedback.textContent = "الملف كبير جدًا.";
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const envelope = parsed?.envelope || parsed;
      if (!globalThis.PassBitVault.validateEnvelope(envelope)) throw new Error("INVALID_VAULT");
      if (favorites.length && !window.confirm("سيستبدل الاستيراد المفضلة الحالية. هل تريد المتابعة؟")) return;
      const importedFavorites = await globalThis.PassBitVault.decryptRecords(vaultPassphrase, envelope);
      await globalThis.PassBitVault.saveEnvelope(envelope);
      favorites = importedFavorites;
      renderVaultFavorites();
      transferFeedback.textContent = "تم الاستيراد بعد التحقق من العبارة الرئيسية.";
      scheduleVaultLock();
    } catch (error) {
      transferFeedback.textContent = "تعذر الاستيراد؛ الملف أو العبارة غير صحيحين.";
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
    if (toggleLabel) toggleLabel.textContent = showPassword ? "إخفاء" : "إظهار";
    toggleButton.setAttribute("aria-label", showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور");
    toggleButton.setAttribute("aria-pressed", String(showPassword));
  });
  retryBreachButton.addEventListener("click", () => requestBreachCheck(currentPasswordForBreach, true));
  copyInputButton.addEventListener("click", () => {
    if (!passwordInput.value) {
      inputFeedback.textContent = "اكتب كلمة المرور أولًا.";
      return;
    }
    copyText(passwordInput.value, inputFeedback);
  });
  openVaultButton.addEventListener("click", () => showView("vault"));
  previewVaultButtons.forEach((button) => button.addEventListener("click", () => showView("vault")));
  closeVaultButton.addEventListener("click", () => showView("check"));
  generateButton.setAttribute("aria-expanded", "false");
  generateButton.addEventListener("click", () => {
    const opening = generatorPanel.hidden;
    if (opening && !generatedPassword) createGeneratedValue();
    generatorPanel.hidden = !opening;
    generateButton.setAttribute("aria-expanded", String(opening));
    generateButton.querySelector("strong").textContent = opening ? "إخفاء المولّد" : "توليد كلمة مرور قوية";
  });
  regenerateButton.addEventListener("click", createGeneratedValue);
  modePasswordButton.addEventListener("click", () => setGeneratorMode("password"));
  modePassphraseButton.addEventListener("click", () => setGeneratorMode("passphrase"));
  passwordLength.addEventListener("change", createGeneratedValue);
  passphraseCount.addEventListener("change", createGeneratedValue);
  passphraseSeparator.addEventListener("change", createGeneratedValue);
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
  saveFavoriteButton.addEventListener("click", saveFavorite);
  favoriteList.addEventListener("click", handleFavoriteAction);
  favoriteSearch.addEventListener("input", () => { scheduleVaultLock(); renderVaultFavorites(); });
  favoriteSort.addEventListener("change", () => { scheduleVaultLock(); renderVaultFavorites(); });
  vaultTimeout.addEventListener("change", scheduleVaultLock);
  exportVaultButton.addEventListener("click", exportVault);
  importVaultButton.addEventListener("click", () => importVaultFile.click());
  importVaultFile.addEventListener("change", importVaultFileContents);

  function showView(view) {
    const showingVault = view === "vault";
    checkView.hidden = showingVault;
    vaultView.hidden = !showingVault;
    if (showingVault) refreshVaultState();
  }

  renderEmpty();
  setGeneratorMode("password");
  refreshVaultState();
  passwordInput.focus();
});
