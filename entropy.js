/*
 * PassBit v1.3.0 — local password analysis engine
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
    "123456", "123456789", "12345678", "password", "password1",
    "qwerty", "qwerty123", "letmein", "admin", "welcome", "iloveyou",
    "monkey", "dragon", "abc123",
  ]);

  function countCodePoints(value) {
    return Array.from(value).length;
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

  function buildSuggestions(password, characterSets, entropyBits) {
    const suggestions = [];
    const suggestionsAr = [];
    if (password.length < 14) {
      suggestions.push("Use at least 14 characters where the site permits it.");
      suggestionsAr.push("استخدم 14 حرفًا على الأقل عندما يسمح الموقع.");
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
    if (/^(.)\1+$/.test(password)) {
      suggestions.push("Avoid repeating the same character.");
      suggestionsAr.push("تجنب تكرار الحرف نفسه.");
    }
    if (/^(0123|1234|2345|abcd|qwer)/i.test(password)) {
      suggestions.push("Avoid predictable sequences and keyboard walks.");
      suggestionsAr.push("تجنب التسلسلات المتوقعة وأنماط لوحة المفاتيح.");
    }
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      suggestions.push("This is a commonly used password; replace it immediately.");
      suggestionsAr.push("هذه كلمة شائعة جدًا؛ استبدلها فورًا.");
    }
    if (entropyBits >= 65 && suggestions.length === 0) {
      suggestions.push("Keep it unique, store it in a password manager, and enable MFA.");
      suggestionsAr.push("احتفظ بها فريدة، واستخدم مدير كلمات مرور، وفعّل المصادقة الثنائية.");
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
    while (characters.length < length) {
      characters.push(allCharacters[randomInt(allCharacters.length)]);
    }
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters.join("");
  }

  function analyzePassword(password) {
    const value = typeof password === "string" ? password : "";
    const length = countCodePoints(value);
    const characterSets = detectCharacterSets(value);
    const poolSize = getPoolSize(characterSets);
    const entropyBits = poolSize > 0 ? length * Math.log2(poolSize) : 0;
    const roundedEntropy = Number(entropyBits.toFixed(1));
    const band = getBand(entropyBits);
    const advice = buildSuggestions(value, characterSets, entropyBits);

    return {
      length,
      poolSize,
      entropyBits: roundedEntropy,
      characterSets,
      band,
      suggestions: advice.suggestions,
      suggestionsAr: advice.suggestionsAr,
      isCommon: COMMON_PASSWORDS.has(value.toLowerCase()),
      progressPercent: Math.min(100, Math.round((entropyBits / 90) * 100)),
    };
  }

  root.PassBitEntropy = Object.freeze({ analyzePassword, detectCharacterSets, getPoolSize, generateStrongPassword });
})(typeof globalThis !== "undefined" ? globalThis : window);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.PassBitEntropy;
}
