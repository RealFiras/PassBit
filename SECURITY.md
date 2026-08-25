# PassBit Security Policy

## Security boundary

PassBit is designed to keep the full password and the full SHA-1 hash in the browser. The breach check sends only the first five hexadecimal characters of the locally computed hash to the Pwned Passwords range endpoint. The returned suffix records are compared locally and are not persisted. An explicitly saved favorite is encrypted with AES-GCM before it is written to `chrome.storage.local`; the master passphrase is never stored.

PassBit does not provide password storage, account recovery, identity verification, malware protection, or a guarantee that a password has never been exposed. The local analyzer also checks common values, predictable substitutions, repetitions, sequences, keyboard walks, date-like values, and page-context words. These are explainable warnings, not proof of compromise or safety. Context words are used only in the page process and are not sent to the breach endpoint. The local generator creates a candidate in memory and the inline double-click panel reads only the selected password field to perform the requested check. A compromised operating system, malicious browser extension, hostile webpage, or remote-access tool may observe a password independently of PassBit.

## Supported security assumptions

The extension assumes that Chrome's extension isolation, the browser's HTTPS validation, and the Pwned Passwords API endpoint are operating as expected. It also assumes that the user understands the requested broad page access needed for inline password-field feedback. The result labelled Clean means only that the exact hash was not returned by the queried corpus at the time of the check; it does not override a local pattern warning. The local score is an estimate based on an assumed character pool and transparent penalties, not a model of every cracking strategy. Vault encryption protects data at rest but not an unlocked popup, a compromised browser profile, malware, or a disclosed master passphrase; there is no recovery path.

## Reporting a vulnerability

Do not publish a real password, breach response, API credential, browser export, or other sensitive material in a public issue. Report a suspected vulnerability privately to the project maintainer, include a reproducible description, affected file or version, impact, and a minimal proof that does not contain live credentials.

## Safe development rules

Never add password values to logs, screenshots, fixtures, tests, URLs, commits, issue reports, or analytics. Use public test values only. The copy button is an explicit user action and may place a generated password on the operating system clipboard; users should clear the clipboard when appropriate. Keep executable code packaged locally and review any permission or host-pattern change before release. Re-run the syntax, manifest, and behavior checks before publishing a new tag.
