# PassBit Security Policy

## Security boundary

PassBit is designed to keep the full password and the full SHA-1 hash in the browser. The breach check sends only the first five hexadecimal characters of the locally computed hash to the Pwned Passwords range endpoint. The returned suffix records are compared locally and are not persisted.

PassBit does not provide password storage, account recovery, identity verification, malware protection, or a guarantee that a password has never been exposed. A compromised operating system, malicious browser extension, hostile webpage, or remote-access tool may observe a password independently of PassBit.

## Supported security assumptions

The extension assumes that Chrome's extension isolation, the browser's HTTPS validation, and the Pwned Passwords API endpoint are operating as expected. It also assumes that the user understands the requested broad page access needed for inline password-field feedback. The result labelled Clean means only that the exact hash was not returned by the queried corpus at the time of the check.

## Reporting a vulnerability

Do not publish a real password, breach response, API credential, browser export, or other sensitive material in a public issue. Report a suspected vulnerability privately to the project maintainer, include a reproducible description, affected file or version, impact, and a minimal proof that does not contain live credentials.

## Safe development rules

Never add password values to logs, screenshots, fixtures, tests, URLs, commits, issue reports, or analytics. Use public test values only. Keep executable code packaged locally and review any permission or host-pattern change before release. Re-run the syntax, manifest, and behavior checks before publishing a new tag.
