# PassBit Design System

**Version:** 1.8.7
**Direction:** Modern Utility / Functional Privacy
**Primary language:** Arabic, RTL
**Popup target:** 400×563px Chrome extension popup

## Purpose

PassBit is a quiet, practical browser utility for checking password strength and breach exposure. The interface should feel like a carefully designed Chrome tool rather than a futuristic cybersecurity dashboard. The design prioritizes clarity, trust, and short decision paths over decoration.

## Visual rules

Use a calm dark surface, slightly lighter charcoal cards, restrained blue actions, thin low-contrast borders, small structural radii, and accessible semantic status colors. Avoid glassmorphism, neon glow, cyberpunk decoration, heavy gradients, 3D illustrations, excessive pills, and icon-only actions without a text label.

The popup uses one vertical RTL column. The primary task is always the password input. Advanced functions are expandable or separated into the favorites view so the first screen remains short and understandable. The live popup follows the supplied Stitch image-to-code export: a compact 400×563 dark container, crisp local SVG controls, icon measurement tiles, four-segment strength bar, HIBP row with chevron, generator row, and masked favorites preview.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| App background | `#1e2126` | Popup background and main canvas |
| Card background | `#262930` | Measurement cards, HIBP card, favorites preview |
| Border | `#3a3f48` | Inputs, cards, separators, and structural controls |
| Text | `#e2e8f0` | Headings and primary content |
| Muted text | `#94a3b8` | Metadata, helper copy, and placeholders |
| Primary blue | `#3b82f6` | Focus, actions, numeric emphasis, and active segments |
| Strong green | `#4ade80` | Positive strength and clean-query status |
| Caution amber | `#fbbf24` | Moderate estimate and caution state |
| Risk red | `#f87171` | Weak or leaked state |

Status must never be communicated by color alone. Pair color with Arabic text, state labels, and short explanations.

## Typography and spacing

Use the locally available Arabic system stack with `Cairo, Tahoma, Arial, sans-serif` fallbacks. Use a monospace fallback such as `Consolas, monospace` for password values. The popup target is 400px wide with a 16px header/content inset, a 24px structural section gap, 12px card/input radii, and a 40px brand mark. Buttons and icon controls remain compact, keyboard-operable, and visually aligned to the Stitch reference.

## Brand assets

`assets/passbit-logo.png` is the standalone PassBit lock/P emblem for README and project branding. `assets/passbit-usage-mockup.png` is a documentation-only 16:9 visual showing the popup beside a generic demo login page; it must not be presented as a real account or a live browser capture.

## Core components

| Component | Rule |
| --- | --- |
| Header | Compact PassBit lock icon, PassBit wordmark, and a small settings/favorites control. |
| Password input | One large masked field with eye and copy controls, plus visible length/type metadata. |
| Measurement cards | Two compact bordered cards with simple line icons for actual Unicode length and active character groups. |
| Strength card | Arabic strength label, short horizontal segmented-looking progress bar, and an accessible hidden explanation. |
| Breach row | `HIBP (حالة التسريب)` heading followed by a compact status row and retry action when needed. |
| Reason details | Native expandable section titled `لماذا ظهرت هذه النتيجة؟`. |
| Generator | Expandable card with explicit random-password/passphrase modes and labeled actions. |
| Vault item | Flat preview row with a globe-style marker, example service label, masked dots, eye/copy affordances, and a clear path to the real encrypted vault. |
| Feedback | Short Arabic status messages such as `تم النسخ` and `تم الحفظ مشفّرًا`. |

## States

The analyzer must support empty, weak, moderate, strong, leaked, loading, and unavailable breach states. The unavailable state must not look clean and must offer an explicit retry. The vault must support setup, locked, unlocked, empty-search, and populated-list states.

## Accessibility

Keep text right-aligned by default, but render password strings left-to-right. Use visible focus rings, keyboard-operable controls, readable contrast, text labels next to meaningful icons, and clear `aria` state updates. Avoid long paragraphs in the primary decision path.

## Privacy copy

The main footer uses the concise privacy statement below. It is displayed in a muted light-gray color against the dark surface:

> التحليل محلي · لا تُرسل كلمة المرور كاملة

The vault uses:

> الخزنة محلية ومشفّرة، والتصدير يحفظ الغلاف المشفّر فقط.

These statements must remain concise and must not imply that the local estimate or a clean breach response is an absolute guarantee.
