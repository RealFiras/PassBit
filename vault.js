/*
 * PassBit v1.2.0 — encrypted local favorites vault
 * The storage envelope contains ciphertext only. The master passphrase stays in memory.
 */
(function (root) {
  "use strict";

  const STORAGE_KEY = "passbit_encrypted_vault_v1";
  const VAULT_VERSION = 1;
  const PBKDF2_ITERATIONS = 600000;
  const SALT_BYTES = 16;
  const IV_BYTES = 12;
  const KEY_BYTES = 256;
  const MAX_RECORDS = 100;
  const MAX_TEXT_LENGTH = 300;
  const MAX_PASSWORD_LENGTH = 4096;

  function randomBytes(length) {
    const result = new Uint8Array(length);
    root.crypto.getRandomValues(result);
    return result;
  }

  function createId() {
    return Array.from(randomBytes(16), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  async function deriveKey(passphrase, salt) {
    if (typeof passphrase !== "string" || passphrase.length < 12) {
      throw new Error("MASTER_PASSPHRASE_TOO_SHORT");
    }
    const material = await root.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return root.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: KEY_BYTES },
      false,
      ["encrypt", "decrypt"],
    );
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") return null;
    const name = typeof record.name === "string" ? record.name.trim().slice(0, MAX_TEXT_LENGTH) : "";
    const username = typeof record.username === "string" ? record.username.trim().slice(0, MAX_TEXT_LENGTH) : "";
    const password = typeof record.password === "string" ? record.password.slice(0, MAX_PASSWORD_LENGTH) : "";
    if (!name || !password) return null;
    return {
      id: typeof record.id === "string" ? record.id.slice(0, 80) : createId(),
      name,
      username,
      password,
      createdAt: Number.isFinite(record.createdAt) ? record.createdAt : Date.now(),
    };
  }

  function normalizeRecords(records) {
    return (Array.isArray(records) ? records : [])
      .slice(0, MAX_RECORDS)
      .map(normalizeRecord)
      .filter(Boolean);
  }

  async function encryptRecords(passphrase, records) {
    const salt = randomBytes(SALT_BYTES);
    const iv = randomBytes(IV_BYTES);
    const key = await deriveKey(passphrase, salt);
    const payload = JSON.stringify({ favorites: normalizeRecords(records) });
    const encoded = new TextEncoder().encode(payload);
    const ciphertext = await root.crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, encoded);
    return {
      version: VAULT_VERSION,
      kdf: { name: "PBKDF2", hash: "SHA-256", iterations: PBKDF2_ITERATIONS },
      cipher: { name: "AES-GCM", tagLength: 128 },
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
      updatedAt: Date.now(),
    };
  }

  async function decryptRecords(passphrase, envelope) {
    if (!envelope || envelope.version !== VAULT_VERSION || typeof envelope.ciphertext !== "string") {
      throw new Error("INVALID_VAULT");
    }
    try {
      const salt = base64ToBytes(envelope.salt);
      const iv = base64ToBytes(envelope.iv);
      const key = await deriveKey(passphrase, salt);
      const plaintext = await root.crypto.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        key,
        base64ToBytes(envelope.ciphertext),
      );
      const parsed = JSON.parse(new TextDecoder().decode(plaintext));
      return normalizeRecords(parsed.favorites);
    } catch (error) {
      const invalid = new Error("INVALID_MASTER_PASSPHRASE");
      invalid.cause = error;
      throw invalid;
    }
  }

  async function readEnvelope() {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    return stored[STORAGE_KEY] || null;
  }

  async function saveRecords(passphrase, records) {
    const envelope = await encryptRecords(passphrase, records);
    await chrome.storage.local.set({ [STORAGE_KEY]: envelope });
    return envelope;
  }

  async function deleteVault() {
    await chrome.storage.local.remove(STORAGE_KEY);
  }

  root.PassBitVault = Object.freeze({
    STORAGE_KEY,
    PBKDF2_ITERATIONS,
    MAX_RECORDS,
    encryptRecords,
    decryptRecords,
    readEnvelope,
    saveRecords,
    deleteVault,
    normalizeRecords,
    createId,
  });
})(typeof globalThis !== "undefined" ? globalThis : window);

if (typeof module !== "undefined" && module.exports) {
  module.exports = globalThis.PassBitVault;
}
