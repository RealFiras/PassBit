# PassBit

**PassBit — Zero-Knowledge Entropy & Breach Detector** is a Manifest V3 Chrome extension created by **Firas**. Version **1.3.0** adds a compact modern Arabic interface, a cryptographically random local password generator, actionable improvement suggestions, a double-click quick-scan chip beside password fields, a new lock-shield logo, and an opt-in encrypted local favorites vault. It combines a local password-entropy estimate with a privacy-preserving Pwned Passwords range query. The extension is intentionally dependency-free: there is no build step, no account, and no telemetry. Passwords are not stored unless the user explicitly saves one in the encrypted favorites vault.

> PassBit is a defensive decision aid. A clean breach response does not prove that a password is safe, and entropy is an estimate rather than a guarantee.

## What is included

The extension package contains `manifest.json` for the MV3 declaration, `entropy.js` for local character-pool, entropy, and generator logic, `vault.js` for PBKDF2/AES-GCM encrypted favorites, `service-worker.js` for local SHA-1 hashing and the range request, `content.js` for password-field integration and the double-click quick-scan chip, and `popup/` for the Arabic user interface, generator, suggestions, and vault controls. The `icons/` directory contains the generated brand icons. `SPECIFICATION.md` contains the full technical design and security model.

## Version 1.3.0 user flow

The popup is intentionally short. It contains one password field, two live measurements for length and character diversity, one dynamic score derived from the calculated entropy, and one breach-status line. Use **توليد كلمة قوية** only when you want a generated alternative; it opens a small inline generator instead of adding another permanent card. The lock icon opens the optional encrypted favorites vault.

On a regular website, double-click a password field. PassBit shows a small **PB · فحص** action beside the field; click it to open the inline scan panel and see the strength, breach result, and suggestions. Chrome does not provide a reliable way for a content script to force the browser toolbar popup open from a page event, so the inline action is the supported equivalent. The toolbar icon remains available for the full popup.

## Local installation

Open Chrome and visit `chrome://extensions/`. Enable **Developer mode**, select **Load unpacked**, and choose the PassBit project directory. Pin PassBit from the extensions toolbar to access the popup. To test inline page integration, open a normal HTTPS website containing a password input, double-click the field, and click the PB action that appears beside it; Chrome internal pages, the Chrome Web Store, and restricted browser surfaces do not allow ordinary content-script execution.

If a file is edited while the extension is loaded, return to `chrome://extensions/` and select **Reload** on the PassBit card. Open the extension card's **Errors** view if a service worker or permission issue needs investigation.

## Privacy model

PassBit computes the Shannon-style estimate locally as `E = L × log2(R)`, where `L` is the number of Unicode code points and `R` is the active character-pool estimate. The breach check computes SHA-1 locally, sends only the first five hexadecimal characters to the Pwned Passwords range endpoint, and compares the returned suffixes in memory. The full password is never placed in a URL, request body, analytics event, or console log. If the user explicitly saves a favorite, its record is stored only inside an authenticated encrypted envelope.

The range endpoint is operated by Have I Been Pwned. PassBit uses HTTPS, omits credentials, requests padding, and immediately discards the response after the local match. The endpoint's current documentation describes the same range-query pattern for checking a password without sending the full hash or password.[1]

## Encrypted favorites vault

The favorites vault is opt-in. On first use, the user creates a master passphrase of at least 12 characters. PassBit derives an AES-256-GCM key with PBKDF2-HMAC-SHA-256, a random per-vault salt, and 600,000 iterations. Each save uses a fresh random 12-byte IV. `chrome.storage.local` receives only the versioned salt, KDF parameters, IV, and ciphertext envelope; the master passphrase and decrypted favorite records remain in memory for the current popup session.

The vault locks automatically when the popup session ends, and the user can lock it manually. There is no password-recovery or reset path: forgetting the master passphrase means the encrypted favorites cannot be decrypted. Encryption at rest does not protect an unlocked session, a compromised browser profile, malware, or an attacker who learns the master passphrase. The copy action is explicit and may place a generated or saved password on the operating system clipboard.

## Algorithm bands

| Estimated entropy | PassBit label | Interpretation |
| --- | --- | --- |
| Below 40 bits | Weak | Increase length and character variety. |
| 40 to 65 bits | Moderate | Prefer a longer, unique passphrase for important accounts. |
| Above 65 bits | Strong | A good estimate, but uniqueness, password-manager storage, and MFA still matter. |

The estimate does not model site-specific password rules, leaked fragments, personal information, keyboard walks, language dictionaries, or a cracking algorithm's cost. The UI therefore presents it as an estimate and supplements it with simple local heuristics.

## GitHub publication

Create a repository under the intended GitHub account, initialize version control in the PassBit directory with `git init`, add the files with `git add .`, create the first commit with `git commit -m "Initial PassBit Manifest V3 extension"`, add the repository remote with `git remote add origin <repository-url>`, and push the default branch with `git push -u origin main`. Replace `<repository-url>` with the user's real repository URL; PassBit does not require a secret or API key.

Publish the project under the MIT License by adding a `LICENSE` file that contains the standard MIT text and retains the copyright holder name **Firas**. The Chrome Web Store has separate listing, privacy disclosure, review, and packaging requirements; review those requirements before submitting a public listing.

## Development checklist

The extension should be tested in a clean Chrome profile and in a profile with strict privacy settings. Confirm that the compact popup handles empty input, Unicode characters, long input, show/hide behavior, live length/diversity measurements, score-ring updates, generator output, vault creation, wrong-passphrase rejection, lock/unlock, delete confirmation, network failure, HTTP failure, a known test password, and a clean result. Confirm that password values do not appear in DevTools logs, URLs, or repository files, and that extension storage contains only an encrypted envelope after a favorite is saved.

The manifest grants the `storage` permission for the encrypted favorites envelope, the Pwned Passwords API host, plus the page access needed for inline password-field analysis. No permissions are requested for tabs, history, cookies, scripting, or identity. Page access is used for password-field feedback, the double-click chip, and the inline suggestion panel; the extension does not submit forms or change their values.

## References

[1]: https://haveibeenpwned.com/API/V3 "Have I Been Pwned API v3 documentation"
[2]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers "Chrome for Developers: Migrate to a service worker"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest "MDN: SubtleCrypto digest() method"
