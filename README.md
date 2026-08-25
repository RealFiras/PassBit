# PassBit

**PassBit — Zero-Knowledge Entropy & Breach Detector** is a Manifest V3 Chrome extension created by **Firas**. Version 1.8.1 adds a calm light-first Arabic interface based on the PassBit Stitch design system, deeper local pattern analysis, a cryptographically random customizable password/passphrase generator, actionable improvement suggestions, clearer HIBP retry states, a double-click quick-scan chip beside password fields, a restrained PB brand mark, and an opt-in encrypted local favorites vault with search and transfer controls. It combines a local password-entropy estimate with a privacy-preserving Pwned Passwords range query. The extension is intentionally dependency-free: there is no build step, no account, and no telemetry. Passwords are not stored unless the user explicitly saves one in the encrypted favorites vault.

> PassBit is a defensive decision aid. A clean breach response does not prove that a password is safe, and entropy is an estimate rather than a guarantee.

## What is included

The extension package contains `manifest.json` for the MV3 declaration, `entropy.js` for local character-pool, raw/effective entropy, pattern findings, and password/passphrase generator logic, `vault.js` for PBKDF2/AES-GCM encrypted favorites and envelope transfer, `service-worker.js` for local SHA-1 hashing and the range request, `content.js` for password-field integration and the double-click quick-scan chip, and `popup/` for the Arabic user interface, generator, suggestions, HIBP retry states, and vault controls. The `icons/` directory contains the generated brand icons. `SPECIFICATION.md` contains the full technical design and security model, while `DESIGN_SYSTEM.md` records the Stitch-based light utility visual rules and tokens.

## Version 1.8.1 user flow

The popup is intentionally short and explicit. Step 1 is the password field. The two tiles show the actual length and character diversity. Step 2 is the calculated local estimate after transparent pattern penalties, followed by the breach-status row. Open **لماذا ظهرت هذه النتيجة؟** to see the local reasons behind the score, including common passwords, repeated characters or chunks, sequences, keyboard walks, dates, phone-like numbers, simple substitutions, and site-context matches when available. The generator now offers **كلمة عشوائية** with a selectable length or **عبارة مرور** with 3–8 random words and a selectable separator. **توليد** makes a fresh value, **نسخ** copies it, and **استخدمها للفحص** places it into the analyzer. The top-right button is labeled **المفضلة** and opens the optional encrypted favorites vault.

On a regular website, double-click a password field. PassBit shows a small **PB · فحص** action beside the field; click it to open the inline scan panel and see the strength, breach result, and suggestions. Chrome does not provide a reliable way for a content script to force the browser toolbar popup open from a page event, so the inline action is the supported equivalent. The toolbar icon remains available for the full popup.

## Local installation

Open Chrome and visit `chrome://extensions/`. Enable **Developer mode**, select **Load unpacked**, and choose the PassBit project directory. Pin PassBit from the extensions toolbar to access the popup. To test inline page integration, open a normal HTTPS website containing a password input, double-click the field, and click the PB action that appears beside it; Chrome internal pages, the Chrome Web Store, and restricted browser surfaces do not allow ordinary content-script execution.

If a file is edited while the extension is loaded, return to `chrome://extensions/` and select **Reload** on the PassBit card. Open the extension card's **Errors** view if a service worker or permission issue needs investigation.

## Privacy model

PassBit computes the Shannon-style estimate locally as `E = L × log2(R)`, where `L` is the number of Unicode code points and `R` is the active character-pool estimate. The breach check computes SHA-1 locally, sends only the first five hexadecimal characters to the Pwned Passwords range endpoint, and compares the returned suffixes in memory. The full password is never placed in a URL, request body, analytics event, or console log. If the user explicitly saves a favorite, its record is stored only inside an authenticated encrypted envelope.

The range endpoint is operated by Have I Been Pwned. PassBit uses HTTPS, omits credentials, requests padding, applies a request timeout, and immediately discards the response after the local match. Temporary network failures, timeouts, rate limits, and unavailable-service responses are shown as unavailable rather than clean and can be retried explicitly. The endpoint's current documentation describes the same range-query pattern for checking a password without sending the full hash or password.[1]

## Encrypted favorites vault

The favorites vault is opt-in. On first use, the user creates a master passphrase of at least 12 characters. PassBit derives an AES-256-GCM key with PBKDF2-HMAC-SHA-256, a random per-vault salt, and 600,000 iterations. Each save uses a fresh random 12-byte IV. `chrome.storage.local` receives only the versioned salt, KDF parameters, IV, and ciphertext envelope; the master passphrase and decrypted favorite records remain in memory for the current popup session.

The vault locks automatically when the popup session ends, and the user can lock it manually or choose a 5-, 15-, or 30-minute popup-session timeout. Favorites can be searched and sorted locally. The **تصدير مشفّر** action writes only the encrypted envelope to a JSON file; importing requires the current master passphrase to authenticate and decrypt the envelope before it replaces the local vault. There is no password-recovery or reset path: forgetting the master passphrase means the encrypted favorites cannot be decrypted. Encryption at rest does not protect an unlocked session, a compromised browser profile, malware, or an attacker who learns the master passphrase. The copy action is explicit and may place a generated or saved password on the operating system clipboard.

## Algorithm bands

| Estimated entropy | PassBit label | Interpretation |
| --- | --- | --- |
| Below 40 bits | Weak | Increase length and character variety. |
| 40 to 65 bits | Moderate | Prefer a longer, unique passphrase for important accounts. |
| Above 65 bits | Strong | A good estimate, but uniqueness, password-manager storage, and MFA still matter. |

The estimate does not model every site-specific password rule, leaked fragment, personal detail, language dictionary, or cracking algorithm. The UI therefore presents it as an estimate and supplements it with local checks for common passwords, repeated characters or chunks, sequences, keyboard walks, date-like values, phone-like numbers, predictable substitutions, and page-context words. The score exposes the raw estimate and the bounded pattern penalty conceptually through the result explanation. These checks explain risk; they do not prove safety.

## Design system

The popup and inline panel use the Stitch **Modern Utility / Functional Privacy** direction: a light surface, restrained blue, thin borders, small corner radii, and readable RTL spacing. The interface avoids glassmorphism, neon glow, cyberpunk decoration, heavy gradients, and unexplained icon-only actions. The full token and component reference is in `DESIGN_SYSTEM.md`.

## Additional local checks

Beyond the Pwned Passwords lookup, PassBit checks patterns entirely on the device. It detects common passwords, repeated characters, repeated chunks, ascending or descending sequences, keyboard walks such as `qwerty`, year/date-like values, simple substitutions such as `p@ssw0rd`, and words related to the current page or field when the inline scanner has that context. The popup exposes these reasons under **لماذا ظهرت هذه النتيجة؟** so the score is explainable rather than a black box. No extra network service receives the password or page context.

## v1.8.1 controls

The generator uses `crypto.getRandomValues` for both random-password and passphrase modes. A random password forces lowercase, uppercase, digits, and symbols before shuffling. A passphrase selects words from a bundled local list; it is not a phrase downloaded from a server. The vault search, sorting, timeout selection, and encrypted-envelope transfer all run inside the popup.

If a breach check is unavailable, PassBit keeps the local strength result visible and shows a specific reason such as network failure, timeout, rate limit, or temporary service unavailability. Use **إعادة الفحص** after the connection is available; an unavailable result is never described as clean.

## GitHub publication

Create a repository under the intended GitHub account, initialize version control in the PassBit directory with `git init`, add the files with `git add .`, create the first commit with `git commit -m "Initial PassBit Manifest V3 extension"`, add the repository remote with `git remote add origin <repository-url>`, and push the default branch with `git push -u origin main`. Replace `<repository-url>` with the user's real repository URL; PassBit does not require a secret or API key.

Publish the project under the MIT License by adding a `LICENSE` file that contains the standard MIT text and retains the copyright holder name **Firas**. The Chrome Web Store has separate listing, privacy disclosure, review, and packaging requirements; review those requirements before submitting a public listing.

## Development checklist

The extension should be tested in a clean Chrome profile and in a profile with strict privacy settings. Confirm that the compact popup handles empty input, Unicode characters, long input, show/hide behavior, live length/diversity measurements, score-ring updates, random-password length choices, passphrase word-count/separator choices, generator output, vault creation, wrong-passphrase rejection, lock/unlock, timeout lock, local search/sort, encrypted import/export, delete confirmation, network failure, timeout, rate limit, HTTP failure, a known test password, and a clean result. Confirm that password values do not appear in DevTools logs, URLs, or repository files, and that extension storage contains only an encrypted envelope after a favorite is saved.

The manifest grants the `storage` permission for the encrypted favorites envelope, the Pwned Passwords API host, plus the page access needed for inline password-field analysis. No permissions are requested for tabs, history, cookies, scripting, or identity. Page access is used for password-field feedback, the double-click chip, and the inline suggestion panel; the extension does not submit forms or change their values.

## References

[1]: https://haveibeenpwned.com/API/V3 "Have I Been Pwned API v3 documentation"
[2]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers "Chrome for Developers: Migrate to a service worker"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest "MDN: SubtleCrypto digest() method"
