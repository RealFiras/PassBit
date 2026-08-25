/*
 * PassBit v1.8.0 — local password analysis engine
 * Author: Firas
 */
(function (root) {
  "use strict";

  const CHARACTER_GROUPS = Object.freeze({
    lowercase: 26,
    uppercase: 26,
    numbers: 10,
    symbols: 33,
  });

  const COMMON_PASSWORDS = new Set([
    "123456", "123456789", "12345678", "1234567890", "123123", "000000", "111111", "654321",
    "password", "password1", "password123", "passw0rd", "qwerty", "qwerty123", "qwertyuiop",
    "letmein", "admin", "welcome", "welcome1", "iloveyou", "monkey", "dragon", "abc123",
    "football", "princess", "login", "secret", "master", "shadow", "sunshine", "changeme",
    "default", "root", "guest", "test", "user", "asdf", "zxcvbn", "zaq12wsx", "1q2w3e4r",
    "كلمةالسر", "كلمة السر", "مرحبا", "اهلا وسهلا", "قpassword",
  ]);

  const KEYBOARD_ROWS = Object.freeze([
    "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890",
  ]);

  const LEET_REPLACEMENTS = Object.freeze({ "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t" });
  const PASSPHRASE_WORDS = Object.freeze([
    "amber", "anchor", "apple", "atlas", "breeze", "bridge", "cactus", "candle", "canyon", "cedar",
    "cloud", "comet", "copper", "coral", "crystal", "dawn", "desert", "falcon", "forest", "garden",
    "harbor", "horizon", "island", "jasmine", "lantern", "lemon", "maple", "meadow", "mercury", "nebula",
    "ocean", "olive", "orbit", "otter", "pebble", "phoenix", "planet", "pluto", "rainbow", "river",
    "saffron", "shadow", "silver", "snow", "solar", "stone", "summit", "thunder", "velvet", "willow",
  ]);

  function countCodePoints(value) {
    return Array.from(value).length;
  }

  function normalize(value) {
    return String(value || "").normalize("NFKC").toLowerCase();
  }

  function compact(value) {
    return normalize(value).replace(/[^\p{L}\p{N}]/gu, "");
  }

  function detectCharacterSets(password) {
    return {
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password),
    };
  }

  function getPoolSize(characterSets) {
    return Object.entries(characterSets).reduce((total, [name, present]) => total + (present ? CHARACTER_GROUPS[name] : 0), 0);
  }

  function getBand(entropyBits) {
    if (entropyBits < 40) {
      return { id: "weak", label: "Weak", labelAr: "ضعيفة", color: "red", advice: "Increase length and add character variety before using this password.", adviceAr: "زِد طولها واستخدم أحرفًا وأرقامًا ورموزًا متنوعة." };
    }
    if (entropyBits <= 65) {
      return { id: "moderate", label: "Moderate", labelAr: "متوسطة", color: "yellow", advice: "Acceptable for low-risk use, but a longer unique passphrase is safer.", adviceAr: "ليست سيئة، لكن كلمة أطول وفريدة ستكون أكثر أمانًا." };
    }
    return { id: "strong", label: "Strong", labelAr: "قوية", color: "green", advice: "Good estimated resistance; keep it unique and never reuse it.", adviceAr: "تقديرها قوي. اجعلها فريدة ولا تستخدمها في أكثر من حساب." };
  }

  function isRepeatedCharacter(password) {
    return password.length >= 3 && /^(.)\1+$/u.test(password);
  }

  function hasRepeatedCharacterRun(password) {
    return /(.)(?:\1){2,}/u.test(password);
  }

  function hasSequentialRun(password) {
    const value = compact(password);
    if (value.length < 4) return false;
    for (let index = 0; index <= value.length - 4; index += 1) {
      const chunk = value.slice(index, index + 4);
      let ascending = true;
      let descending = true;
      for (let cursor = 1; cursor < chunk.length; cursor += 1) {
        const difference = chunk.charCodeAt(cursor) - chunk.charCodeAt(cursor - 1);
        ascending = ascending && difference === 1;
        descending = descending && difference === -1;
      }
      if (ascending || descending) return true;
    }
    return false;
  }

  function hasKeyboardWalk(password) {
    const value = compact(password);
    return KEYBOARD_ROWS.some((row) => {
      const candidates = [row, Array.from(row).reverse().join("")];
      return candidates.some((candidate) => {
        for (let length = 4; length <= candidate.length; length += 1) {
          for (let start = 0; start <= candidate.length - length; start += 1) {
            if (value.includes(candidate.slice(start, start + length))) return true;
          }
        }
        return false;
      });
    });
  }

  function hasRepeatedChunk(password) {
    const value = compact(password);
    if (value.length < 4) return false;
    for (let start = 0; start <= value.length - 4; start += 1) {
      for (let chunkLength = 2; chunkLength <= 4; chunkLength += 1) {
        const first = value.slice(start, start + chunkLength);
        const second = value.slice(start + chunkLength, start + chunkLength * 2);
        if (first.length === chunkLength && first === second) return true;
      }
    }
    return false;
  }

  function looksLikeDate(password) {
    const value = compact(password);
    if (/(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/.test(value)) return true;
    if (/(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])(?:19|20)\d{2}/.test(value)) return true;
    return /(?:19|20)\d{2}/.test(value);
  }

  function looksLikePhone(password) {
    const value = compact(password);
    const digits = value.replace(/[^\d]/gu, "");
    return digits.length >= 7 && digits.length >= value.length * 0.7;
  }

  function looksLikeLeetCommon(password) {
    const normalized = normalize(password);
    let converted = "";
    let changed = false;
    for (const character of normalized) {
      if (LEET_REPLACEMENTS[character]) {
        converted += LEET_REPLACEMENTS[character];
        changed = true;
      } else {
        converted += character;
      }
    }
    return changed && COMMON_PASSWORDS.has(compact(converted));
  }

  function matchesContext(password, contextWords) {
    const value = compact(password);
    if (value.length < 4 || !Array.isArray(contextWords)) return false;
    return contextWords.some((word) => {
      const candidates = String(word || "").split(/[^\p{L}\p{N}]+/u).map((part) => compact(part)).filter((part) => part.length >= 4);
      return candidates.some((token) => value.includes(token));
    });
  }

  function collectFindings(password, options) {
    const normalized = normalize(password);
    const commonPassword = COMMON_PASSWORDS.has(normalized) || COMMON_PASSWORDS.has(compact(normalized));
    const repeatedCharacter = isRepeatedCharacter(password);
    const repeatedRun = hasRepeatedCharacterRun(password);
    const sequentialRun = hasSequentialRun(password);
    const keyboardWalk = hasKeyboardWalk(password);
    const repeatedChunk = hasRepeatedChunk(password);
    const dateLike = looksLikeDate(password);
    const phoneLike = looksLikePhone(password);
    const leetCommon = looksLikeLeetCommon(password);
    const contextMatch = matchesContext(password, options.contextWords);
    const findings = [];

    if (commonPassword) findings.push({ id: "common", severity: "high", en: "This is a commonly used password.", ar: "هذه كلمة شائعة ومعروفة للمهاجمين." });
    if (leetCommon) findings.push({ id: "leet", severity: "high", en: "Simple symbol substitutions do not make a common password safe.", ar: "استبدال بعض الأحرف برموز لا يجعل الكلمة الشائعة آمنة." });
    if (repeatedCharacter) findings.push({ id: "repeat", severity: "high", en: "The same character is repeated.", ar: "الحرف نفسه مكرر عدة مرات." });
    else if (repeatedRun) findings.push({ id: "repeat-run", severity: "medium", en: "A character is repeated several times.", ar: "يوجد حرف مكرر عدة مرات داخل الكلمة." });
    if (repeatedChunk) findings.push({ id: "chunk", severity: "high", en: "A short part is repeated across the password.", ar: "يوجد مقطع قصير مكرر داخل كلمة المرور." });
    if (sequentialRun) findings.push({ id: "sequence", severity: "medium", en: "It contains an obvious sequence such as 1234 or abcd.", ar: "تحتوي على تسلسل واضح مثل 1234 أو abcd." });
    if (keyboardWalk) findings.push({ id: "keyboard", severity: "medium", en: "It contains a keyboard walk such as qwerty.", ar: "تحتوي على نمط من لوحة المفاتيح مثل qwerty." });
    if (dateLike) findings.push({ id: "date", severity: "medium", en: "It looks like a year or a date.", ar: "تبدو كسنة أو تاريخ واضح." });
    if (phoneLike) findings.push({ id: "phone", severity: "medium", en: "It contains a phone-like number.", ar: "تحتوي على رقم يشبه رقم هاتف." });
    if (contextMatch) findings.push({ id: "context", severity: "high", en: "It contains a word related to this site or field.", ar: "تحتوي على اسم مرتبط بالموقع أو الحقل." });

    return { commonPassword, repeatedCharacter, repeatedRun, sequentialRun, keyboardWalk, repeatedChunk, dateLike, phoneLike, leetCommon, contextMatch, findings };
  }

  function buildSuggestions(password, characterSets, effectiveEntropyBits, checks) {
    const suggestions = [];
    const suggestionsAr = [];
    if (countCodePoints(password) < 14) {
      suggestions.push("Use at least 14 characters where the site permits it.");
      suggestionsAr.push("استخدم 14 حرفًا على الأقل عندما يسمح الموقع.");
    }
    if (checks.commonPassword) {
      suggestions.push("Replace this commonly used password completely.");
      suggestionsAr.push("استبدل كلمة المرور الشائعة بالكامل، ولا تعدّلها فقط.");
    }
    if (checks.leetCommon) {
      suggestions.push("Do not rely on simple symbol substitutions.");
      suggestionsAr.push("لا تعتمد على استبدال الأحرف برموز بسيطة.");
    }
    if (checks.repeatedCharacter || checks.repeatedRun || checks.repeatedChunk) {
      suggestions.push("Avoid repeating one character or short chunk.");
      suggestionsAr.push("تجنب تكرار حرف أو مقطع قصير.");
    }
    if (checks.sequentialRun) {
      suggestions.push("Avoid predictable sequences.");
      suggestionsAr.push("تجنب التسلسلات المتوقعة.");
    }
    if (checks.keyboardWalk) {
      suggestions.push("Avoid keyboard patterns such as qwerty.");
      suggestionsAr.push("تجنب أنماط لوحة المفاتيح مثل qwerty.");
    }
    if (checks.dateLike) {
      suggestions.push("Avoid dates and obvious years.");
      suggestionsAr.push("تجنب التواريخ والسنوات الواضحة.");
    }
    if (checks.phoneLike) {
      suggestions.push("Do not use a phone number as the main part of a password.");
      suggestionsAr.push("لا تستخدم رقم هاتف كجزء أساسي من كلمة المرور.");
    }
    if (checks.contextMatch) {
      suggestions.push("Do not include the site or field name.");
      suggestionsAr.push("لا تستخدم اسم الموقع أو الحقل داخلها.");
    }
    if (!characterSets.lowercase) {
      suggestions.push("Add lowercase letters.");
      suggestionsAr.push("أضف أحرفًا صغيرة.");
    }
    if (!characterSets.uppercase) {
      suggestions.push("Add uppercase letters.");
      suggestionsAr.push("أضف أحرفًا كبيرة.");
    }
    if (!characterSets.numbers) {
      suggestions.push("Add numbers.");
      suggestionsAr.push("أضف أرقامًا.");
    }
    if (!characterSets.symbols) {
      suggestions.push("Add symbols or punctuation.");
      suggestionsAr.push("أضف رموزًا أو علامات ترقيم.");
    }
    if (effectiveEntropyBits >= 65 && suggestions.length === 0) {
      suggestions.push("Keep it unique and enable MFA.");
      suggestionsAr.push("احتفظ بها فريدة وفعّل المصادقة الثنائية.");
    }
    return { suggestions, suggestionsAr };
  }

  function randomInt(maximum) {
    const limit = Math.floor(0x100000000 / maximum) * maximum;
    const buffer = new Uint32Array(1);
    do {
      root.crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return buffer[0] % maximum;
  }

  function generateStrongPassword(length = 20) {
    const targetLength = Math.max(12, Math.min(128, Number.isFinite(length) ? Math.floor(length) : 20));
    const groups = ["abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789", "!@#$%^&*()-_=+[]{}:,.?"];
    const characters = groups.map((group) => group[randomInt(group.length)]);
    const allCharacters = groups.join("");
    while (characters.length < targetLength) characters.push(allCharacters[randomInt(allCharacters.length)]);
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters.join("");
  }

  function generatePassphrase(wordCount = 4, separator = "-") {
    const count = Math.max(3, Math.min(8, Number.isFinite(wordCount) ? Math.floor(wordCount) : 4));
    const allowedSeparators = new Set(["-", " ", ".", "_"]);
    const safeSeparator = allowedSeparators.has(separator) ? separator : "-";
    const words = [];
    for (let index = 0; index < count; index += 1) words.push(PASSPHRASE_WORDS[randomInt(PASSPHRASE_WORDS.length)]);
    return words.join(safeSeparator);
  }

  function analyzePassword(password, options = {}) {
    const value = typeof password === "string" ? password : "";
    const length = countCodePoints(value);
    const characterSets = detectCharacterSets(value);
    const poolSize = getPoolSize(characterSets);
    const entropyBits = poolSize > 0 ? length * Math.log2(poolSize) : 0;
    const checks = collectFindings(value, options);
    const penalties = {
      commonPassword: checks.commonPassword ? 55 : 0,
      leetCommon: checks.leetCommon ? 35 : 0,
      repeatedCharacter: checks.repeatedCharacter ? 35 : 0,
      repeatedRun: !checks.repeatedCharacter && checks.repeatedRun ? 12 : 0,
      repeatedChunk: checks.repeatedChunk ? 25 : 0,
      sequentialRun: checks.sequentialRun ? 18 : 0,
      keyboardWalk: checks.keyboardWalk ? 18 : 0,
      dateLike: checks.dateLike ? 12 : 0,
      phoneLike: checks.phoneLike ? 10 : 0,
      contextMatch: checks.contextMatch ? 22 : 0,
    };
    const patternPenaltyBits = Object.values(penalties).reduce((sum, penalty) => sum + penalty, 0);
    const effectiveEntropyBits = Math.max(0, entropyBits - patternPenaltyBits);
    const roundedEntropy = Number(entropyBits.toFixed(1));
    const roundedEffectiveEntropy = Number(effectiveEntropyBits.toFixed(1));
    const band = getBand(effectiveEntropyBits);
    const advice = buildSuggestions(value, characterSets, effectiveEntropyBits, checks);

    return {
      length,
      poolSize,
      entropyBits: roundedEntropy,
      effectiveEntropyBits: roundedEffectiveEntropy,
      patternPenaltyBits,
      characterSets,
      band,
      findings: checks.findings,
      findingsAr: checks.findings.map((finding) => finding.ar),
      suggestions: advice.suggestions,
      suggestionsAr: advice.suggestionsAr,
      primarySuggestionAr: advice.suggestionsAr[0] || "احتفظ بها فريدة ولا تعِد استخدامها.",
      isCommon: checks.commonPassword,
      checks: {
        commonPassword: checks.commonPassword,
        leetCommon: checks.leetCommon,
        repeatedCharacter: checks.repeatedCharacter,
        repeatedRun: checks.repeatedRun,
        repeatedChunk: checks.repeatedChunk,
        sequentialRun: checks.sequentialRun,
        keyboardWalk: checks.keyboardWalk,
        dateLike: checks.dateLike,
        phoneLike: checks.phoneLike,
        contextMatch: checks.contextMatch,
      },
      progressPercent: Math.min(100, Math.round((effectiveEntropyBits / 90) * 100)),
    };
  }

  root.PassBitEntropy = Object.freeze({ analyzePassword, detectCharacterSets, getPoolSize, generateStrongPassword, generatePassphrase });
})(typeof globalThis !== "undefined" ? globalThis : window);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.PassBitEntropy;
