# PassBit Design System

**Version:** 1.8.1  
**Direction:** Modern Utility / Functional Privacy  
**Primary language:** Arabic, RTL  
**Popup target:** 380px wide Chrome extension popup

## Purpose

PassBit is a quiet, practical browser utility for checking password strength and breach exposure. The interface should feel like a carefully designed Chrome tool rather than a futuristic cybersecurity dashboard. The design prioritizes clarity, trust, and short decision paths over decoration.

## Visual rules

Use a light-first surface, flat white cards, restrained blue actions, thin neutral borders, small structural radii, and accessible semantic status colors. Avoid glassmorphism, neon glow, cyberpunk decoration, heavy gradients, 3D illustrations, excessive pills, and icon-only actions without a text label.

The popup uses one vertical RTL column. The primary task is always the password input. Advanced functions are expandable or separated into the favorites view so the first screen remains short and understandable.

## Color tokens

| Token | Value | Use |
| --- | --- | --- |
| Surface | `#F9F9FF` | Popup background |
| Surface low | `#F0F3FF` | Measurement cards and quiet fields |
| Card | `#FFFFFF` | Main cards and list items |
| Text | `#151C27` | Headings and primary content |
| Muted text | `#5F6675` | Metadata and helper copy |
| Border | `#C3C6D7` | Inputs and structural controls |
| Soft border | `#E5E7EF` | Separators and low-emphasis cards |
| Primary | `#2563EB` | Primary actions and focus |
| Primary dark | `#004AC6` | Primary text and hover state |
| Primary soft | `#DBE6FF` | Focus backgrounds and active controls |
| Strong / clean | `#087F5B` | Positive status |
| Strong soft | `#D8F4E8` | Positive status background |
| Moderate | `#A95400` | Caution status |
| Moderate soft | `#FFF0D9` | Caution status background |
| Weak / leaked | `#BA1A1A` | High-risk status |
| Weak soft | `#FFDAD6` | High-risk status background |

Status must never be communicated by color alone. Pair color with Arabic text, state labels, and short explanations.

## Typography and spacing

Use IBM Plex Sans Arabic when it is available, with `Tahoma, Arial, sans-serif` fallbacks. Use a monospace fallback such as JetBrains Mono or Consolas for password values. Default popup edge spacing is 16px, the common stack gap is 10–12px, and the standard structural radius is 8px. Buttons use 6px radii; status dots may be circular.

## Core components

| Component | Rule |
| --- | --- |
| Header | Compact PassBit wordmark, restrained flat PB mark, and clear `المفضلة` action. |
| Password input | One large masked field, explicit `إظهار` / `إخفاء` button, and visible length/type metadata. |
| Measurement cards | Two quiet cards for actual Unicode length and active character groups. |
| Strength card | Score number with a simple horizontal bar, Arabic status, and short explanation. |
| Breach row | Separate status card with checking, clean, leaked, or unavailable state; show `إعادة الفحص` when needed. |
| Reason details | Native expandable section titled `لماذا ظهرت هذه النتيجة؟`. |
| Generator | Expandable card with explicit random-password/passphrase modes and labeled actions. |
| Vault item | Flat list item with service name, optional username, masked password, and text-labeled actions. |
| Feedback | Short Arabic status messages such as `تم النسخ` and `تم الحفظ مشفّرًا`. |

## States

The analyzer must support empty, weak, moderate, strong, leaked, loading, and unavailable breach states. The unavailable state must not look clean and must offer an explicit retry. The vault must support setup, locked, unlocked, empty-search, and populated-list states.

## Accessibility

Keep text right-aligned by default, but render password strings left-to-right. Use visible focus rings, keyboard-operable controls, readable contrast, text labels next to meaningful icons, and clear `aria` state updates. Avoid long paragraphs in the primary decision path.

## Privacy copy

The main footer uses:

> التحليل محلي · لا تُرسل كلمة المرور كاملة

The vault uses:

> الخزنة محلية ومشفّرة، والتصدير يحفظ الغلاف المشفّر فقط.

These statements must remain concise and must not imply that the local estimate or a clean breach response is an absolute guarantee.
