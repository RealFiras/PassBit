# PassBit Design System

**Version:** 1.8.6
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
| Surface | `#0F141C` | Popup background |
| Surface low | `#151B25` | Measurement cards and quiet fields |
| Card | `#1A212C` | Main cards and list items |
| Text | `#F3F6FB` | Headings and primary content |
| Muted text | `#AAB4C3` | Metadata and helper copy |
| Border | `#435064` | Inputs and structural controls |
| Soft border | `#2B3544` | Separators and low-emphasis cards |
| Primary | `#70A7FF` | Primary actions and focus |
| Primary bright | `#9BC2FF` | Primary text and hover state |
| Primary soft | `#1D3760` | Focus backgrounds and active controls |
| Strong / clean | `#5BD8A8` | Positive status |
| Strong soft | `#153D32` | Positive status background |
| Moderate | `#F4BA63` | Caution status |
| Moderate soft | `#3D2D17` | Caution status background |
| Weak / leaked | `#FF938B` | High-risk status |
| Weak soft | `#4A2226` | High-risk status background |

Status must never be communicated by color alone. Pair color with Arabic text, state labels, and short explanations.

## Typography and spacing

Use IBM Plex Sans Arabic when it is available, with `Tahoma, Arial, sans-serif` fallbacks. Use a monospace fallback such as JetBrains Mono or Consolas for password values. Default popup edge spacing is 16px, the common stack gap is 10–12px, and the standard structural radius is 8px. Buttons use 6px radii; status dots may be circular.

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
