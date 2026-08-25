# PassBit — Zero-Knowledge Entropy & Breach Detector

**Version:** 1.8.3
**Author:** Firas — Cybersecurity Student & Web Security Researcher  
**Platform:** Google Chrome Extension, Manifest V3  
**Document status:** Production-oriented implementation specification

## Scope and design intent

PassBit is a privacy-first browser extension that estimates password strength locally, checks whether the exact password has appeared in the Pwned Passwords corpus without sending the password or its complete hash to a remote service, generates strong passwords locally, and optionally stores favorites in an authenticated encrypted local vault. Version 1.8.3 applies the Stitch Modern Utility / Functional Privacy direction in a calm dark mode and maps the GitHub Hero reference into the live popup: a compact header, eye/copy input actions, measurement tiles, horizontal strength bar, HIBP row, generator row, and favorites preview. It uses charcoal surfaces, slightly lighter cards, restrained blue actions, subtle borders, and a simpler inline panel without neon or glassmorphism. It retains the deeper local pattern analysis, specific improvement guidance, clearer HIBP network states with retry, customizable random-password and passphrase generation, organized vault search and sorting, encrypted-envelope import/export, and configurable vault auto-lock introduced in v1.8.0. The dark palette is a visual update only and does not change the security model. The implementation is deliberately small, dependency-free, and auditable. It uses a Manifest V3 service worker for network communication, a content script for inline page feedback, and an extension popup for manual analysis.

The security boundary is explicit. Entropy is a mathematical estimate based on an assumed character pool; it is not a proof that a password is random. The breach result is a corpus lookup; a clean response does not prove that a password has never been exposed elsewhere. The UI uses this language so that users are not given false certainty.

## Section 1: Project Identity & Branding Concept

### 1.1 Product identity

PassBit combines the words “password” and “bit” to communicate both credential protection and measurable information content. The release name is **PassBit — Zero-Knowledge Entropy & Breach Detector**, with version **v1.8.3**. The creator and author credit is **Firas**, described as a Cybersecurity Student and Web Security Researcher.

The core value proposition is a zero-cost, privacy-first Chrome Extension that provides an immediate password-strength estimate, explainable local warnings, and a breach exposure signal directly inside the browser. The extension does not require an account, does not store passwords by default, and does not add analytics or telemetry; an explicitly saved favorite is stored only as authenticated ciphertext. The only outbound request is the privacy-preserving range request needed for the optional breach check.

### 1.2 Brand direction

The visual language is **Modern Utility / Functional Privacy** in a calm dark mode. The product uses charcoal surfaces, slightly lighter cards, restrained blue, thin low-contrast borders, small structural radii, and clear semantic status colors. It avoids glassmorphism, neon glow, cyberpunk decoration, heavy gradients, and decorative dashboard effects. High-risk states use accessible red, caution uses amber, verified positive states use green, and primary actions use restrained blue.

| Brand token | Visual role | Intended meaning |
| --- | --- | --- |
| Charcoal | Page background | Calm low-glare workspace for sensitive input. |
| Lighter charcoal | Cards and fields | Separation without heavy shadows. |
| Restrained Blue | Focus, primary actions, local analysis | Clear interaction and privacy boundary. |
| Muted Gray | Borders and metadata | Hierarchy without visual noise. |
| Signal Red | Breach or weak-password warning | Immediate action is required. |
| Amber | Moderate estimate | Caution and improvement opportunity. |
| Green | Strong estimate or clean query result | Positive signal, not a guarantee. |

The logo treatment is a restrained flat `PB` mark in the popup header, while the supplied PNG icons remain available for the Chrome toolbar and manifest identity. The mark is intentionally simple and readable at small sizes rather than decorative.

### 1.3 Product principles

PassBit follows five product principles. First, an unsaved password remains in memory only for the shortest practical time; an explicitly saved favorite is stored only as authenticated ciphertext. Second, the privacy model is visible to the user rather than hidden in a legal footnote. Third, every remote result is treated as a signal with limitations. Fourth, the interface must be useful while a user is completing a form, not only after a form is submitted. Fifth, all executable JavaScript is packaged locally, consistent with Manifest V3's extension security model.[2]

## Section 2: Mathematical Algorithms & Security Models

### 2.1 Shannon-style entropy estimate

PassBit uses the standard character-pool estimate `E = L × log2(R)`, where `E` is estimated entropy in bits, `L` is password length measured as Unicode code points, and `R` is the estimated size of the active character pool. The formula assumes each character is independently selected with uniform probability from the active pool. Human-created passwords rarely meet those assumptions, so PassBit labels the value **estimated entropy**.

The implementation evaluates four character groups and subtracts transparent, bounded penalties when local heuristics identify patterns that are easier to guess than the idealized pool formula suggests. Lowercase Latin letters contribute 26 possible characters when at least one lowercase letter is present. Uppercase Latin letters contribute 26 when present. Decimal digits contribute 10 when present. Symbols and punctuation contribute an operational estimate of 33 when at least one non-alphanumeric character is present. The active pool is the sum of the groups detected in the password, not the number of distinct characters the user happened to type.

| Detection | Pool contribution | Example trigger |
| --- | ---: | --- |
| Lowercase Latin | 26 | `a` through `z` |
| Uppercase Latin | 26 | `A` through `Z` |
| Decimal digits | 10 | `0` through `9` |
| Symbols or punctuation | 33 | Any non-ASCII-alphanumeric character |

For example, a password containing lowercase letters and digits has `R = 36`. A 12-character value in that estimated pool has `E = 12 × log2(36)`, or approximately 62.0 bits. A password containing all four groups has `R = 95`, producing approximately 78.8 bits at 12 characters under the same idealized assumption.

The displayed bands are intentionally conservative product guidance rather than a universal cryptographic standard. Values below 40 bits are labelled **Weak**, values from 40 through 65 bits are labelled **Moderate**, and values above 65 bits are labelled **Strong**. A strong band still requires uniqueness, resistance to personal-information guessing, safe storage, and multi-factor authentication.

### 2.2 Local heuristics

Entropy alone cannot detect the fact that a user typed a common password, a predictable substitution, a repeated character or chunk, a keyboard walk, a sequence, a year/date, a phone-like number, or a word tied to the current site or field. PassBit therefore adds lightweight local heuristics for those patterns and exposes the findings and suggestions to the user. The effective estimate is `max(0, entropyBits - patternPenaltyBits)`; the raw estimate remains available for transparency. These heuristics never leave the browser and are supplementary; they do not replace a password manager's generator or a proper password-strength estimator trained on password datasets.

The engine counts Unicode code points for length so that a non-ASCII symbol is not accidentally counted as two JavaScript UTF-16 code units. Character-pool classification remains intentionally narrow and transparent: Latin case, decimal digits, and a broad “symbol” fallback. This makes the estimate auditable but means that the result should be interpreted carefully for non-Latin scripts.

### 2.3 K-Anonymity zero-knowledge privacy model

PassBit's breach check is a client-side K-Anonymity workflow. The password itself is not sent to the network. The current Pwned Passwords range API accepts a partial SHA-1 hash and returns the matching suffix records; the client performs the final comparison locally.[1]

| Step | Local operation | Network-visible data |
| --- | --- | --- |
| A. Local hashing | Convert the password to UTF-8 and calculate SHA-1 with `crypto.subtle.digest`. | Nothing yet. |
| B. Hash splitting | Uppercase the 40-character hexadecimal digest and split it into a 5-character prefix plus a 35-character suffix. | Nothing yet. |
| C. Privacy query | Request the range endpoint using only the 5-character prefix. | The prefix, request metadata, and ordinary network information. |
| D. Local matching | Parse returned suffix/count lines in memory and compare the exact 35-character suffix. | The full suffix is not sent. |
| E. Disposal | Keep only the result needed for the UI and release the response after processing. | No password storage or telemetry. |

The range request uses HTTPS, omits credentials, requests response padding, and identifies the client with a descriptive User-Agent. The extension declares only the API host in `host_permissions`; it does not request cookies, tabs, history, storage, identity, or browsing-data permissions. The content script does require page access to provide the requested inline border feedback, so users should treat that permission as part of the trust decision.

SHA-1 deserves precise qualification. SHA-1 is not suitable for new cryptographic security designs, and MDN warns against using it for cryptographic applications.[3] PassBit uses SHA-1 only because the Pwned Passwords range corpus is keyed by SHA-1 and the hash is used as a lookup identifier, not as a password-storage scheme, signature, MAC, or proof of password security. PassBit does not claim that SHA-1 is collision-resistant for general cryptographic use.

K-Anonymity reduces what the API can learn from the application query, but it does not make the entire network path anonymous. A remote service may still observe the partial prefix, timestamp, IP address, and normal transport metadata. PassBit therefore accurately describes the model as **zero-knowledge with respect to the full password and full hash**, not as an anonymity network.

### 2.4 Encrypted local favorites vault

The favorites vault is opt-in and is opened from the separate **المفضلة** tab. The user creates a master passphrase of at least 12 characters. PassBit derives an AES-256-GCM key with PBKDF2-HMAC-SHA-256, a random 16-byte salt, and 600,000 iterations. Each encryption save uses a fresh random 12-byte IV and authenticated 128-bit GCM tag.

| Stored envelope field | Purpose | Plaintext status |
| --- | --- | --- |
| `version` | Identifies the envelope format. | Non-secret metadata. |
| `kdf` | Records PBKDF2 hash and iteration parameters. | Non-secret metadata. |
| `salt` | Makes the password-derived key unique to the vault. | Non-secret random value. |
| `iv` | Makes each AES-GCM encryption invocation unique. | Non-secret random value. |
| `ciphertext` | Contains the favorite names, optional usernames, passwords, IDs, and timestamps. | Authenticated ciphertext only. |

Only this envelope is written to `chrome.storage.local`. The master passphrase is never stored, decrypted favorites are held only in popup memory, and the vault is locked when the popup session ends or the user presses **قفل**. There is no recovery path. Encryption at rest does not protect an unlocked popup, a compromised browser profile, malware, or a disclosed master passphrase. This is a local encrypted favorites feature, not a claim that PassBit replaces a mature password-manager product.

### 2.5 Result interpretation

A **Leaked** result means the exact SHA-1 hash suffix matched a record returned for the queried prefix. The count is the corpus's occurrence count; it is not a count of unique websites, people, or current account compromises. A **Clean result** means no matching suffix was returned by that corpus at query time. A network error, timeout, rate limit, unavailable service, or invalid response means the extension does not make a breach claim; the UI offers an explicit retry instead of labeling the value clean.

## Section 3: Architecture & File Structure

Manifest V3 replaces persistent background pages with event-driven service workers. Service workers run away from the page's main thread, cannot use the DOM directly, and should use `fetch()` rather than `XMLHttpRequest()` for network access.[2] PassBit follows those constraints.

| Component | Responsibility | Trust boundary |
| --- | --- | --- |
| `manifest.json` | Declares MV3, metadata, popup, service worker, content scripts, icons, minimum Chrome version, API host permission, and the `storage` permission. | Browser extension policy. |
| `entropy.js` | Calculates local character sets, raw/effective entropy, pattern penalties, explainable findings, suggestions, cryptographically random passwords, and random passphrases. | Runs in popup and content-script isolated worlds; no network code. |
| `vault.js` | Derives keys with PBKDF2, encrypts/decrypts favorite records with AES-GCM, validates encrypted envelopes, and exposes import/export storage operations without persisting plaintext. | Extension popup only; the master passphrase remains in memory. |
| `service-worker.js` | Receives a password only from the extension contexts, hashes it locally, queries the range API, performs suffix matching, and returns a minimal result. | Extension background context and API boundary. |
| `content.js` | Detects password inputs, responds to a double-click with a small PB quick-scan action, opens a light inline scan panel, applies red/amber/blue/green semantic states, and shows Arabic suggestions. | Page-facing isolated content-script context. |
| `popup/index.html` | Defines the Arabic RTL popup, plain-language result card, generator controls, suggestions, optional technical details, and creator credit. | Extension UI document. |
| `popup/popup.css` | Implements the Stitch light-first utility layout, neutral borders, restrained blue actions, semantic result states, focus treatment, and reduced-motion support. | Local static styling only. |
| `popup/popup.js` | Connects Arabic input, show/hide controls, generator modes/options, copy/use actions, suggestions, retry states, vault setup/unlock/lock/save/delete flows, search/sort, auto-lock, and encrypted-envelope transfer. | UI controller; no direct API call. |
| `icons/icon16.png` through `icon128.png` | Provides toolbar and extension-management identity. | Static package assets. |
| `README.md` | Provides installation, privacy, testing, and GitHub publication guidance. | Public project documentation. |

The event listener in the service worker is registered at top level. The message handler returns a pending response while the asynchronous fetch completes, then returns only `ok`, `status`, `count`, and `queried` fields. Vault storage is handled by the popup through `vault.js`; the service worker does not write vault data.

The popup uses an input debounce so that a keystroke does not immediately create a request. A monotonically increasing request identifier prevents a slower response for an old value from overwriting a newer UI state. The show/hide control changes only the local input type. The generator uses `crypto.getRandomValues`, forces at least one character from each configured group for random-password mode, shuffles the result with the same random source, and keeps the value in memory until the user copies it or sends it to the analyzer. Passphrase mode selects words from a local list using the same cryptographic random source and supports 3–8 words with a small allowlisted separator set.

The content script uses a `WeakMap` for per-field UI state and a bounded set only for repositioning visible controls during scrolling. A `MutationObserver` handles forms rendered after initial page load. The observer tracks password inputs and password-like autocomplete fields, but it does not scan arbitrary text inputs or read page text. A double-click shows a small `PB · فحص` action beside the field; the user clicks that action to open the inline scan panel. Each field receives only a short-lived state marker and panel. The panel shows local findings, suggestions, effective estimated bits, and an explicit retry control when the breach check is unavailable. Chrome does not provide a reliable content-script path for forcing the toolbar popup open from a page event, so the inline action is the supported equivalent; the toolbar icon remains available for the full popup.[6] [7]

## Section 4: Interface & User Experience Specifications

### 4.1 Popup interface

The popup is a compact Arabic RTL security panel with a calm charcoal background, restrained flat PB mark, slightly lighter cards, one password field, two live measurement tiles, one simple horizontal score indicator adjusted by explainable local pattern checks, one breach-status row with retry, and a collapsed `لماذا ظهرت هذه النتيجة؟` explanation section. The inline page action and panel use the same dark card surface, neutral border, restrained blue, and semantic status colors. The generator supports a customizable random-password mode and a 3–8 word passphrase mode with explicit generate, copy, and use-for-analysis actions. The optional encrypted favorites vault opens as a separate view with search, sorting, auto-lock selection, encrypted-envelope import/export, and delete controls. The main screen avoids ambiguous icons and technical paragraphs.

| UI region | Behavior | Accessibility expectation |
| --- | --- | --- |
| Header | Shows PassBit, version 1.8.2, and a restrained flat PB mark. | Brand text remains available independently of the mark. |
| Password input | Accepts a value locally and updates length, character diversity, score, advice, and breach status after each input event. | Visible label, autocomplete hint, focus ring, and password type by default. |
| Show/HIDE control | Toggles visibility only while the popup remains open. | Button label and `aria-pressed` state change together. |
| Live measurements | Shows actual Unicode length and the number of active character groups out of four. | The values are text, not color-only indicators. |
| Dynamic score | Shows a 0–100 normalized display based on effective estimated entropy after transparent local pattern penalties, while the details expose the reason. | The result label, local estimate wording, and explanation remain visible beside the horizontal indicator. |
| Main result | Shows Arabic Weak, Moderate, or Strong guidance in plain language. | The action text is visible and not color-only. |
| Breach status | Shows checking, clean result, hit count, timeout/network/rate-limit/unavailable states, and a retry action. | Status updates are written into a live region and unavailable is never presented as clean. |
| Generator | Creates a customizable random password or 3–8 word passphrase locally using cryptographic randomness. | Mode, length/word count, separator, output, and copy/use controls are explicit. |
| Suggestions | Lists Arabic, locally derived improvement suggestions. | Native list semantics and readable contrast. |
| Favorites tab | Creates, unlocks, locks, searches, sorts, imports, exports, and deletes the opt-in encrypted local vault; auto-lock is configurable per popup session. | The master passphrase is required, imported envelopes are authenticated before storage, and there is no recovery path. |
| Technical details | The main quick-check view avoids technical numbers; vault warnings remain visible. | Advanced data is optional rather than blocking the main decision. |
| Footer | Credits Firas and states the local-analysis boundary. | Plain text, not an image-only disclosure. |

The main result card is actionable rather than merely decorative. A weak result advises increasing length and variety. A moderate result recommends a longer, unique passphrase for important accounts. A strong result reminds the user that uniqueness, password-manager storage, and MFA remain important. A leaked result instructs the user not to use the password and to change it wherever it was reused. The generator offers a practical alternative instead of requiring the user to invent a stronger value.

### 4.2 Inline page integration

On normal web pages, PassBit identifies password inputs and listens for a user double-click. The double-click displays a small `PB · فحص` action beside the field. Clicking that action opens an inline panel showing the Arabic strength result, breach status, and improvement suggestions. The field receives a matching dark-mode semantic border after the check without neon glow or decorative shadow. The panel closes when the user clicks elsewhere, the action times out, the user closes it, or the field value changes. The page's original value is never replaced and the extension does not submit forms.

| Border state | Meaning | Visual treatment |
| --- | --- | --- |
| Red | High risk: weak estimate or exact breach match. | Signal-red border, dark red surface, and explicit warning text. |
| Amber | Caution: 40–65 estimated bits. | Amber border, dark amber surface, and improvement guidance. |
| Blue | Analysis in progress or transport boundary. | Restrained-blue border and checking state. |
| Green | Strong estimate or clean corpus result. | Green border, dark green surface, and positive explanatory text. |
| Neutral fallback | Query unavailable. | Neutral border with no clean-or-leaked claim. |

The content script does not execute on Chrome internal pages or other restricted browser surfaces. Some websites may replace or encapsulate password controls inside cross-origin frames or browser-managed UI; those surfaces are outside the extension's guaranteed coverage. Content scripts run in an isolated world, but the extension should still be reviewed carefully before being granted broad site access.

### 4.3 Failure states

A network timeout, non-2xx API response, malformed response, or unavailable service worker produces **Unavailable** rather than **Clean**. An empty input clears the metrics and cancels the pending request. If the user types a new value while an old query is in flight, the old response is ignored. Excessively long input is rejected by the service worker with a bounded error to avoid unbounded memory use.

## Section 5: Step-by-Step Setup & Deployment Guide

### 5.1 Local developer installation

First, place the complete PassBit directory on the development computer. Confirm that the root contains `manifest.json`, `entropy.js`, `service-worker.js`, `content.js`, `popup/`, and `icons/`. No package manager or compilation step is required for this implementation.

Open Google Chrome and navigate to `chrome://extensions/`. Enable **Developer mode** in the upper-right corner. Select **Load unpacked** and choose the PassBit directory. Pin the extension to the toolbar, open the popup, and type a test value. For inline integration, open an ordinary HTTPS page with a password field, double-click that field, and click the `PB · فحص` action that appears. Use the extension card's **Reload** control after any file edit.

To inspect runtime behavior, use the extension card's **service worker** link to open the service-worker console and use the extension card's **Errors** link for manifest or permission failures. Do not log passwords while testing. If a browser page does not show a border, verify that it is not a browser-internal page, a restricted store page, or a field inside a cross-origin frame.

### 5.2 GitHub open-source deployment

Create an empty GitHub repository, retain the project author as **Firas**, and add an MIT License file. In the project directory, initialize a repository with `git init`, stage the files with `git add .`, create a descriptive first commit with `git commit -m "Initial PassBit Manifest V3 extension"`, add the real repository URL with `git remote add origin <repository-url>`, and push the default branch with `git push -u origin main`.

The public README should explain the K-Anonymity range flow, the entropy formula, the limitations of estimated entropy, the permissions requested, and the local installation steps. The source repository should not contain real passwords, API credentials, browser exports, or captured breach responses. Keep the `LICENSE` file at the repository root and include the Firas attribution requested by the project brief.

### 5.3 Chrome Web Store readiness

Before store submission, review the current Chrome Web Store policies, permission justifications, privacy disclosure requirements, and extension package rules. The broad content-script match pattern is required for the requested inline password-field feature, but it also creates a meaningful trust decision. The store listing should explain why page access is requested, why the Pwned Passwords host is requested, what data is transmitted, and what data is not stored.

## Section 6: Security Review Checklist

| Review area | Acceptance condition |
| --- | --- |
| Password handling | No password is written to `chrome.storage`, cookies, URLs, analytics, repository files, or console logs. |
| Hashing | SHA-1 is used only for the HIBP-compatible range identifier; it is not described as secure password storage. |
| Transport | API requests use HTTPS, omit credentials, and send only the five-character prefix. |
| Response handling | Returned suffixes are matched in memory and discarded after the current check. |
| Manifest | The service worker is MV3, executable code is packaged locally, and permissions are minimal for the feature set. |
| UI semantics | Red, yellow, cyan, green, and fallback states include text labels and not color alone. |
| Race safety | Stale asynchronous responses cannot overwrite the current input's state. |
| Failure safety | Service failure produces Unavailable, never a false Clean state. |
| Page behavior | The extension does not submit forms, change password values, or copy to the clipboard from a page event. |
| Vault confidentiality | `chrome.storage.local` contains only the versioned salt, KDF parameters, IV, and AES-GCM ciphertext envelope. |
| Vault lifecycle | The master passphrase and decrypted favorites are cleared when the popup session ends or the user locks the vault. |
| Documentation | The README discloses the privacy model, limitations, author, license direction, and installation path. |

## References

[1]: https://haveibeenpwned.com/API/V3 "Have I Been Pwned API v3 documentation"
[2]: https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers "Chrome for Developers: Migrate to a service worker"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest "MDN: SubtleCrypto digest() method"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey "MDN: SubtleCrypto deriveKey() method"
[5]: https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies "Chrome for Developers: Storage and cookies"
[6]: https://developer.chrome.com/docs/extensions/reference/api/action "Chrome for Developers: chrome.action API"
[7]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging "Chrome for Developers: Message passing"
