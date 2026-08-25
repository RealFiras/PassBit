/*
 * PassBit v1.7.0 — local password analysis engine
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
    "123456", "123456789", "12345678", "1234567890", "password", "password1", "password123",
    "qwerty", "qwerty123", "qwertyuiop", "letmein", "admin", "welcome", "iloveyou",
    "monkey", "dragon", "abc123", "football", "princess", "login", "passw0rd",
    "كلمةالسر", "كلمة السر", "مرحبا", "اهلا وسهلا",
  ]);

  const KEYBOARD_ROWS = Object.freeze([
    "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890",
  ]);

  const LEET_REPLACEMENTS = Object.freeze({ "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "$": "s", "5": "s", "7": "t" });

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
    return Object.entries(characterSets).reduce((total, [name, present]) => {
      return total + (present ? CHARACTER_GROUPS[name] : 0);
    }, 0);
  }

  function getBand(entropyBits) {
    if (entropyBits < 40) {
      return {
        id: "weak",
        label: "Weak",
        labelAr: "ضعيفة",
        color: "red",
        advice: "Increase length and add character variety before using this password.",
        adviceAr: "زِد طولها واستخدم أحرفًا وأرقامًا ورموزًا متنوعة.",
      };
    }
    if (entropyBits <= 65) {
      return {
        id: "moderate",
        label: "Moderate",
        labelAr: "متوسطة",
        color: "yellow",
        advice: "Acceptable for low-risk use, but a longer unique passphrase is safer.",
        adviceAr: "ليست سيئة، لكن كلمة أطول وفريدة ستكون أكثر أمانًا.",
      };
    }
    return {
      id: "strong",
      label: "Strong",
      labelAr: "قوية",
      color: "green",
      advice: "Good estimated resistance; keep it unique and never reuse it.",
      adviceAr: "تقديرها قوي. اجعلها فريدة ولا تستخدمها في أكثر من حساب.",
    };
  }

  function isRepeatedCharacter(password) {
    return password.length >= 3 && /^(.)\1+$/.test(password);
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
      const reversed = Array.from(row).reverse().join("");
      for (let length = 4; length <= row.length; length += 1) {
        for (let start = 0; start <= row.length - length; start += 1) {
          const walk = row.slice(start, start + length);
          if (value.includes(walk) || value.includes(reversed.slice(start, start + length))) return true;
        }
      }
      return false;
    });
  }

  function hasRepeatedChunk(password) {
    const value = compact(password);
    for (let chunkLength = 2; chunkLength <= Math.floor(value.length / 2); chunkLength += 1) {
      const chunk = value.slice(0, chunkLength);
      if (chunk && value === chunk.repeat(Math.floor(value.length / chunkLength)) && value.length % chunkLength === 0) return true;
    }
    return false;
  }

  function looksLikeDate(password) {
    const value = compact(password);
    if (/(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/.test(value)) return true;
    if (/(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])(?:19|20)\d{2}/.test(value)) return true;
    return /(?:19|20)\d{2}/.test(value);
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

  function collectFindings(password, options, characterSets) {
    const normalized = normalize(password);
    const commonPassword = COMMON_PASSWORDS.has(normalized);
    const repeatedCharacter = isRepeatedCharacter(password);
    const sequentialRun = hasSequentialRun(password);
    const keyboardWalk = hasKeyboardWalk(password);
    const repeatedChunk = hasRepeatedChunk(password);
    const dateLike = looksLikeDate(password);
    const leetCommon = looksLikeLeetCommon(password);
    const contextMatch = matchesContext(password, options.contextWords);
    const findings = [];

    if (commonPassword) findings.push({ id: "common", severity: "high", en: "This is a commonly used password.", ar: "هذه كلمة شائعة ومعروفة للمهاجمين." });
    if (leetCommon) findings.push({ id: "leet", severity: "high", en: "Simple symbol substitutions do not make a common password safe.", ar: "استبدال بعض الأحرف برموز لا يجعل الكلمة الشائعة آمنة." });
    if (repeatedCharacter) findings.push({ id: "repeat", severity: "high", en: "The same character is repeated.", ar: "الحرف نفسه مكرر عدة مرات." });
    if (repeatedChunk) findings.push({ id: "chunk", severity: "high", en: "A short part is repeated across the password.", ar: "يوجد مقطع قصير مكرر داخل كلمة المرور." });
    if (sequentialRun) findings.push({ id: "sequence", severity: "medium", en: "It contains an obvious sequence such as 1234 or abcd.", ar: "تحتوي على تسلسل واضح مثل 1234 أو abcd." });
    if (keyboardWalk) findings.push({ id: "keyboard", severity: "medium", en: "It contains a keyboard walk such as qwerty.", ar: "تحتوي على نمط من لوحة المفاتيح مثل qwerty." });
    if (dateLike) findings.push({ id: "date", severity: "medium", en: "It looks like a year or a date.", ar: "تبدو كسنة أو تاريخ واضح." });
    if (contextMatch) findings.push({ id: "context", severity: "high", en: "It contains a word related to this site or field.", ar: "تحتوي على اسم مرتبط بالموقع أو الحقل." });

    return { commonPassword, repeatedCharacter, sequentialRun, keyboardWalk, repeatedChunk, dateLike, leetCommon, contextMatch, findings, characterSets };
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
      suggestionsAr.push("استبدل كلمة المرور الشائعة بالكامل.");
    }
    if (checks.leetCommon) {
      suggestions.push("Do not rely on simple symbol substitutions.");
      suggestionsAr.push("لا تعتمد على استبدال الأحرف برموز بسيطة.");
    }
    if (checks.repeatedCharacter || checks.repeatedChunk) {
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
    const groups = [
      "abcdefghijklmnopqrstuvwxyz",
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      "0123456789",
      "!@#$%^&*()-_=+[]{}:,.?",
    ];
    const characters = groups.map((group) => group[randomInt(group.length)]);
    const allCharacters = groups.join("");
    while (characters.length < length) characters.push(allCharacters[randomInt(allCharacters.length)]);
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters.join("");
  }

  function analyzePassword(password, options = {}) {
    const value = typeof password === "string" ? password : "";
    const length = countCodePoints(value);
    const characterSets = detectCharacterSets(value);
    const poolSize = getPoolSize(characterSets);
    const entropyBits = poolSize > 0 ? length * Math.log2(poolSize) : 0;
    const checks = collectFindings(value, options, characterSets);
    const penalties = {
      commonPassword: checks.commonPassword ? 55 : 0,
      leetCommon: checks.leetCommon ? 35 : 0,
      repeatedCharacter: checks.repeatedCharacter ? 35 : 0,
      repeatedChunk: checks.repeatedChunk ? 25 : 0,
      sequentialRun: checks.sequentialRun ? 18 : 0,
      keyboardWalk: checks.keyboardWalk ? 18 : 0,
      dateLike: checks.dateLike ? 12 : 0,
      contextMatch: checks.contextMatch ? 22 : 0,
    };
    const effectiveEntropyBits = Math.max(0, entropyBits - Object.values(penalties).reduce((sum, penalty) => sum + penalty, 0));
    const roundedEntropy = Number(entropyBits.toFixed(1));
    const roundedEffectiveEntropy = Number(effectiveEntropyBits.toFixed(1));
    const band = getBand(effectiveEntropyBits);
    const advice = buildSuggestions(value, characterSets, effectiveEntropyBits, checks);

    return {
      length,
      poolSize,
      entropyBits: roundedEntropy,
      effectiveEntropyBits: roundedEffectiveEntropy,
      characterSets,
      band,
      findings: checks.findings,
      findingsAr: checks.findings.map((finding) => finding.ar),
      suggestions: advice.suggestions,
      suggestionsAr: advice.suggestionsAr,
      isCommon: checks.commonPassword,
      checks: {
        commonPassword: checks.commonPassword,
        leetCommon: checks.leetCommon,
        repeatedCharacter: checks.repeatedCharacter,
        repeatedChunk: checks.repeatedChunk,
        sequentialRun: checks.sequentialRun,
        keyboardWalk: checks.keyboardWalk,
        dateLike: checks.dateLike,
        contextMatch: checks.contextMatch,
      },
      progressPercent: Math.min(100, Math.round((effectiveEntropyBits / 90) * 100)),
    };
  }

  root.PassBitEntropy = Object.freeze({ analyzePassword, detectCharacterSets, getPoolSize, generateStrongPassword });
})(typeof globalThis !== "undefined" ? globalThis : window);

if (typeof module !== "undefined" && module.exports) module.exports = globalThis.PassBitEntropy;
