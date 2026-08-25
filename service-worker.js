"use strict";

const PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const MAX_PASSWORD_LENGTH = 4096;
const PASSBIT_USER_AGENT = "PassBit/1.3.1 (Chrome Extension; Firas)";

async function sha1Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function parsePwnedResponse(responseText, targetSuffix) {
  for (const line of responseText.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const suffix = line.slice(0, separator).trim().toUpperCase();
    if (suffix !== targetSuffix) continue;
    const count = Number.parseInt(line.slice(separator + 1).trim(), 10);
    return Number.isFinite(count) ? count : 0;
  }
  return 0;
}

async function checkPasswordBreach(password) {
  if (typeof password !== "string" || password.length === 0) {
    return { status: "not_checked", count: 0, queried: false };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("Password input is too long to analyze safely.");
  }

  const fullHash = await sha1Hex(password);
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);
  const response = await fetch(`${PWNED_PASSWORDS_RANGE_URL}${prefix}`, {
    method: "GET",
    headers: {
      "Add-Padding": "true",
      "User-Agent": PASSBIT_USER_AGENT,
    },
    cache: "no-store",
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Breach service returned HTTP ${response.status}.`);
  }

  const responseText = await response.text();
  const count = parsePwnedResponse(responseText, suffix);
  return {
    status: count > 0 ? "leaked" : "clean",
    count,
    queried: true,
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "PASSBIT_CHECK_BREACH") return undefined;

  checkPasswordBreach(message.password)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({
      ok: false,
      status: "error",
      count: 0,
      queried: false,
      error: error instanceof Error ? error.message : "Unable to complete breach check.",
    }));

  return true;
});
