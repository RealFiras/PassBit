/*
 * PassBit v1.0.0 — local password analysis engine
 * Author: Firas
 *
 * This file contains no network code. It can be loaded by the popup and
 * content script so entropy analysis remains local to the browser.
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
        color: "red",
        advice: "Increase length and add character variety before using this password.",
      };
    }
    if (entropyBits <= 65) {
      return {
        id: "moderate",
        label: "Moderate",
        color: "yellow",
        advice: "Acceptable for low-risk use, but a longer unique passphrase is safer.",
      };
    }
    return {
      id: "strong",
      label: "Strong",
      color: "green",
      advice: "Good estimated resistance; keep it unique and never reuse it.",
    };
  }

  function buildSuggestions(password, characterSets, entropyBits) {
    const suggestions = [];
    if (password.length < 14) suggestions.push("Use at least 14 characters where the site permits it.");
    if (!characterSets.lowercase) suggestions.push("Add lowercase letters.");
    if (!characterSets.uppercase) suggestions.push("Add uppercase letters.");
    if (!characterSets.numbers) suggestions.push("Add numbers.");
    if (!characterSets.symbols) suggestions.push("Add symbols or punctuation.");
    if (/^(.)\1+$/.test(password)) suggestions.push("Avoid repeating the same character.");
    if (/^(0123|1234|2345|abcd|qwer)/i.test(password)) suggestions.push("Avoid predictable sequences and keyboard walks.");
    if (COMMON_PASSWORDS.has(password.toLowerCase())) suggestions.push("This is a commonly used password; replace it immediately.");
    if (entropyBits >= 65 && suggestions.length === 0) suggestions.push("Keep it unique, store it in a password manager, and enable MFA.");
    return suggestions;
  }

  function analyzePassword(password) {
    const value = typeof password === "string" ? password : "";
    const length = countCodePoints(value);
    const characterSets = detectCharacterSets(value);
    const poolSize = getPoolSize(characterSets);
    const entropyBits = poolSize > 0 ? length * Math.log2(poolSize) : 0;
    const roundedEntropy = Number(entropyBits.toFixed(1));
    const band = getBand(entropyBits);

    return {
      length,
      poolSize,
      entropyBits: roundedEntropy,
      characterSets,
      band,
      suggestions: buildSuggestions(value, characterSets, entropyBits),
      isCommon: COMMON_PASSWORDS.has(value.toLowerCase()),
      progressPercent: Math.min(100, Math.round((entropyBits / 90) * 100)),
    };
  }

  root.PassBitEntropy = Object.freeze({
    analyzePassword,
    detectCharacterSets,
    getPoolSize,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.PassBitEntropy;
}
