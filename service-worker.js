"use strict";

const PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const MAX_PASSWORD_LENGTH = 4096;
const REQUEST_TIMEOUT_MS = 12000;
const PASSBIT_USER_AGENT = "PassBit/1.8.7 (Chrome Extension; Firas)";

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

function classifyHttpStatus(status) {
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "service_unavailable";
  return "http_error";
}

async function checkPasswordBreach(password) {
  if (typeof password !== "string" || password.length === 0) return { status: "not_checked", count: 0, queried: false };
  if (password.length > MAX_PASSWORD_LENGTH) {
    const error = new Error("Password input is too long to analyze safely.");
    error.code = "invalid_input";
    throw error;
  }

  const fullHash = await sha1Hex(password);
  const prefix = fullHash.slice(0, 5);
  const suffix = fullHash.slice(5);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${PWNED_PASSWORDS_RANGE_URL}${prefix}`, {
      method: "GET",
      headers: { "Add-Padding": "true", "User-Agent": PASSBIT_USER_AGENT },
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
  } catch (error) {
    const wrapped = new Error(error?.name === "AbortError" ? "Breach service request timed out." : "Breach service network request failed.");
    wrapped.code = error?.name === "AbortError" ? "timeout" : "network_error";
    throw wrapped;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = new Error(`Breach service returned HTTP ${response.status}.`);
    error.code = classifyHttpStatus(response.status);
    throw error;
  }

  let responseText;
  try {
    responseText = await response.text();
  } catch (error) {
    const wrapped = new Error("Breach service response could not be read.");
    wrapped.code = "invalid_response";
    wrapped.cause = error;
    throw wrapped;
  }
  const count = parsePwnedResponse(responseText, suffix);
  return { status: count > 0 ? "leaked" : "clean", count, queried: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "PASSBIT_CHECK_BREACH") return undefined;

  checkPasswordBreach(message.password)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({
      ok: false,
      status: error?.code || "network_error",
      count: 0,
      queried: false,
      error: "تعذر إكمال فحص التسريب.",
    }));

  return true;
});
