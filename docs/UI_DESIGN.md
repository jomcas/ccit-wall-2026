# CCIT Wall — UI Design Reference

> Purpose: A design-system reference doc summarizing the current UI of CCIT Wall (social platform for NU Manila CCIT), intended to brief another planning/design model before proposing changes. Reflects the implementation as of 2026-07-31.

## 1. Concept & Visual Metaphor

The app's visual identity is a **campus cork bulletin board**. Design language mixes:
- A warm **cork board background** (light mode) using layered CSS gradients (grain + fiber texture + vignette) — no images.
- **Paper card** primitives (`.paper`) with soft "papery" shadows for posts/panels.
- Decorative **tape** pseudo-elements (`.paper--taped`) simulating taped-up notices.
- **Stamp/tag chips** (`.stamp`) — bordered, uppercase, slightly rotated labels evoking a rubber stamp.
- Institutional branding: **NU Gold** and **NU Ink Blue** as brand accents, NU shield logo in header/sidebar/landing page.
- Dark mode swaps the metaphor to a **charcoal board** (slate surfaces) rather than pure black, keeping gold accents vivid.

Typography reinforces the "bulletin/poster" feel:
- Headings: `Playfair Display` (serif, display) — poster-style headlines.
- Body: `Source Sans 3` (sans-serif).
- Monospace: `JetBrains Mono` (used sparingly, e.g. code/IDs).

## 2. Design Tokens (`frontend/src/styles/tokens.css`)

Single source of truth; dark mode is implemented as a full token flip under `[data-theme="dark"]` (toggled via `data-theme` attribute on `<html>`, controlled by `ThemeContext`).

### Color roles
| Role | Light | Dark |
|---|---|---|
| Background | `#d4b896` (warm cork) | `#1c1f26` (charcoal) |
| Card surface (`--surface-1`) | `#faf6f0` (cream paper) | `#282c35` |
| Secondary surface | `#f3ece2` | `#2e323c` |
| Ink (primary text) | `#1a1612` | `#eae5df` |
| Secondary text | `#5c534a` | `#a39e97` |
| Muted text | `#8a7f73` | `#7a756e` |
| Accent — Gold | `#d4a012` | `#e8b816` |
| Accent — Ink Blue | `#1e3a5f` | `#5b92cf` |
| Danger | `#b91c1c` | `#f87171` |
| Success | `#15803d` | `#4ade80` |
| Warning | `#a16207` | `#fbbf24` |
| Info | `#1e40af` | `#60a5fa` |
| Border | `#d6ccbc` | `#3a3f4a` |

### Type scale
`--text-xs` 12px → `--text-4xl` 48px (modular, "poster-inspired"). Line-heights: tight (1.2) / snug (1.35) / normal (1.6) / relaxed (1.75). Letter-spacing includes a special `--tracking-stamp` (0.12em) for stamp labels.

### Spacing
8px grid: `--space-1` (4px) through `--space-10` (64px).

### Radii
`--radius-xs` 3px → `--radius-full` (pill). Cards typically use `--radius-md` (10px).

### Shadows
Soft, "papery" multi-layer shadows (`--shadow-xs` … `--shadow-xl`), plus bespoke `--shadow-pin` (pushpin drop shadow) and `--shadow-paper` (card edge lift).

### Motion
`--ease-out`, `--ease-in-out`, `--ease-spring`; durations 120/200/350ms. Respects `prefers-reduced-motion` (durations collapse to 0ms).

### Z-index scale
base(1) → dropdown(100) → sticky(200) → overlay(300) → modal(400) → toast(500).

## 3. Core UI Primitives

Defined once in `tokens.css`, reused everywhere via className:

- **`.paper`** — base card: surface-1 bg, 1px border, `--radius-md`, paper shadow.
- **`.paper--taped`** — adds two rotated "tape strip" pseudo-elements at top corners.
- **`.stamp` / `.stamp--gold` / `.stamp--danger`** — rotated (-1deg), bordered uppercase tag chips (category labels, status badges).
- **`.btn`** — base button (44px min height/touch target), with variants:
  - `.btn--primary` (Ink Blue fill)
  - `.btn--secondary` (Gold fill)
  - `.btn--ghost` (outlined/transparent)
  - `.btn--danger` (outlined red, fills red bg on hover)
  - `.btn--text` (no border/bg, minimal)
  - Size modifiers: `.btn--sm`, `.btn--lg`, `.btn--icon`
- **`.input`** — 44px min height, 2px border, inset surface background, focus ring uses `--accent-ink-muted` glow + border color swap.

Focus accessibility: global `:focus-visible` outline uses `--accent-gold`, 2px offset.

## 4. Application Shell (Logged-in Layout)

Component: `Layout.tsx` → class `.app-layout`.

**Structure:** 3-column CSS grid, fixed top header:
```
grid-template-columns: 260px 1fr 300px;   /* Left sidebar | Main content | Right sidebar */
padding-top: 72px;                          /* clears fixed top header */
```

### Top Header (`.top-header`) — fixed, full-width
- **Left:** NU shield logo + "CCIT Wall" / "National University Manila" brand text (links to `/feed`).
- **Center:** Global search input (`FiSearch` icon) filtering posts, with clear (`FiX`) button; syncs to URL query params (`?search=`).
- **Right:** Theme toggle (sun/moon), mobile "users" drawer trigger, notification bell with unread badge + popover, logout.

### Notification Bell Popover
- Bell icon with numeric badge (caps at "99+").
- Dropdown popover: header ("Notifications" + "Mark all read"), list of last 5 notifications (icon per type: like ❤, comment 💬, reaction, generic bell), each clickable → navigates to the related post and marks as read.
- Polls unread count every 10s.

### Left Sidebar (`.sidebar-left`, fixed, 260px, scrollable)
1. Logo block (hidden on desktop — brand lives in top header; shown on mobile drawer variant).
2. **User preview card**: avatar (or initial-letter placeholder) + name + role, on `--surface-2` inset panel.
3. **Main nav**: Feed (`FiHome`), Profile (`FiUser`), About (`FiInfo`) — active state highlighting via route match.
4. **Category filter list** (only shown on `/feed`): All Posts, College Activities, General, Extracurricular — each with an icon, syncs to URL `?category=`.

### Main Content (center column, flexible width)
Renders routed page content (Feed, Profile, CreatePost, etc.) inside the `1fr` grid track.

### Right Sidebar (`.sidebar-right`, 300px)
"Community" panel:
- Header: `FiUsers` icon + "Community" title + live member count.
- Search input to filter members by name/email.
- Scrollable list of `UserRow` items (avatar, name, role) — admins and current user excluded.
- Capped at 15 visible; "+N more members" indicator beyond that.
- Collapsible/hidden on smaller screens (`showRightSidebar` prop on `Layout`).

### Responsive behavior
Breakpoints observed in `index.css`: `1024px`, `768px`, `480px`, `360px`. At narrower widths the 3-column grid collapses (sidebars become off-canvas drawers — `MobileUserDrawer` component replaces the right sidebar; left sidebar nav likely becomes a slide-out menu triggered by a hamburger/menu icon, using `FiMenu`/`FiX`).

## 5. Page-by-Page Breakdown

### Public / Unauthenticated routes
Rendered without the app shell (no sidebars/header — each page manages its own chrome).

- **`/` — Landing Page** (`LandingPage.tsx` + `LandingPage.css`)
  - Custom nav bar (`landing-nav`): logo, anchor links (Features / About / Contact), Sign in link, "Get Started" CTA button, theme toggle.
  - **Hero section**: textured `landing-hero__bg` background, floating decorative cards absolutely positioned around the hero (e.g. "Share Ideas" card top-left with gold icon chip; "Notifications" preview card top-right showing mock notification rows).
  - **Hero center**: circular logo badge (NU shield), large Playfair Display headline with a colored "accent" span ("Connect, share, and learn **all in one place**"), subtitle copy, two CTAs (`Get Started Free` primary, `Sign In` secondary/outlined).
  - Further sections (referenced by nav anchors): `#features`, `#about`, `#contact` — feature highlights presumably using icons `FiUsers`, `FiShare2`, `FiBookOpen`, `FiMessageSquare`, `FiBell`, `FiImage`.

- **`/login`, `/register`, `/forgot-password`, reset password** — use shared `AuthLayout.tsx` wrapper (centered card form pattern typical of auth flows), with `AuthErrorAlert.tsx` for inline error messaging.

### Authenticated routes (rendered inside `Layout` app shell)

- **`/feed` — Feed** (`Feed.tsx`)
  - Search-results banner when a query is active ("Showing results for "…"").
  - `CreatePostWidget` — composer box at top of feed (theme picker, image attach, etc.).
  - Posts list (`posts-list`) of `Post` cards, or an empty state (`FiInbox` icon + heading + subcopy) when nothing matches.
  - Supports category filtering and search via URL params (driven by header search + left sidebar categories).

- **`/create` — Create Post** (`CreatePost.tsx`) — dedicated composer page (full form vs. the feed's inline widget).

- **Post Card** (`Post.tsx`) — the core content unit:
  - Optional **themed background** — posts can carry a `theme` (10 gradient presets: Ocean Blue, Sunset Vibes, Golden Hour, Mint Fresh, Coral Reef, Deep Purple, Midnight, Teams Teal, NU Gold, NU Blue, plus "None").
  - **Display modes** driven by content length/attachments (`getPostDisplayMode`):
    - `poster` — full-bleed colored background, large centered text (Facebook-style), used when a theme is set, no attachments, and text ≤ 280 chars.
    - `banner` — theme gradient confined to a header strip only (Teams-style), used when there are attachments or longer text.
    - `normal` — plain paper card, no theme.
  - Header: author avatar, name, timestamp (`formatTimeAgo`: "just now", "Xm/h/d ago", else date), category stamp chip.
  - Body: title + description; up to 4 image attachments with drag-and-drop re-upload support in edit mode (`FiUploadCloud`, dropzone).
  - Actions bar: Like (heart, filled `FaHeart` vs outline `FiHeart`, with count), Comment toggle (`FiMessageCircle`), Edit (`FiEdit2`) / Delete (`FiTrash2`) for the post owner.
  - Inline **comments** section: list (paginated "show more", starts at 3 visible), add-comment input with send (`FiSend`), per-comment like, edit/delete (owner only), confirm-dialog gated deletes (`ConfirmDialog.tsx`).
  - **Image lightbox** (`ImageLightbox.tsx`) for viewing attachments full-screen.

- **`/profile` — Profile** (`Profile.tsx`) — current user's own profile: profile picture upload (`ProfilePictureUploader.tsx`), account info, presumably their own posts list.

- **`/user/:userId` — User Profile** (`UserProfile.tsx`) — public view of another member's profile.

- **`/notifications` — Notifications** (`Notifications.tsx`) — full notifications page/history (vs. the header's 5-item popover).

- **`/about` — About** (`About.tsx`) — static informational page about the platform/college.

## 6. Shared / Supporting Components

| Component | Role |
|---|---|
| `ThemeToggle.tsx` | Light/dark mode switch (sun/moon icon), persists via `ThemeContext` + `data-theme` attribute |
| `MobileUserDrawer.tsx` | Off-canvas drawer replacing the right "Community" sidebar on small screens |
| `SessionExpiredDialog.tsx` | Modal shown when Firebase session/token expires, prompts re-auth |
| `ConfirmDialog.tsx` | Generic confirm/cancel modal (used for delete post/comment) |
| `AuthErrorAlert.tsx` | Inline banner for auth error messages (login/register) |
| `NotificationBell.tsx` / `NotificationItem.tsx` | Notification bell trigger + individual row renderer (may overlap with logic embedded in `Layout.tsx`) |
| `UserRow.tsx` | Compact avatar + name + role row used in the Community sidebar |
| `CreatePostWidget.tsx` | Inline post composer shown at the top of the Feed |

## 7. Iconography & Assets

- Icon set: **react-icons/fi** (Feather icons) throughout — `FiHome`, `FiUser`, `FiGrid`, `FiBookOpen`, `FiUsers`, `FiStar`, `FiInfo`, `FiSearch`, `FiBell`, `FiHeart`, `FiMessageCircle`, `FiCheckCircle`, `FiMenu`, `FiX`, `FiEdit2`, `FiTrash2`, `FiSend`, `FiImage`, `FiUploadCloud`, `FiInbox`, `FiShare2`, `FiMessageSquare`.
- Filled variant `FaHeart` (react-icons/fa) used for the "liked" state contrast against outline `FiHeart`.
- Brand logo: NU shield SVG pulled from Wikimedia Commons, reused in top header, left sidebar, and landing page/hero badge.

## 8. Post Theme Presets (`frontend/src/config/themes.ts`)

| Theme | Gradient | Text |
|---|---|---|
| None | transparent | default ink |
| Ocean Blue | `#667eea → #764ba2` | white |
| Sunset Vibes | `#f093fb → #f5576c` | white |
| Golden Hour | `#f6d365 → #fda085` | dark |
| Mint Fresh | `#11998e → #38ef7d` | white |
| Coral Reef | `#ff6b6b → #feca57` | dark |
| Deep Purple | `#5f2c82 → #49a09d` | white |
| Midnight | `#232526 → #414345` | white |
| Teams Teal | `#6264a7 → #464775` | white |
| NU Gold | `#ffc107 → #ff9800` | dark |
| NU Blue | `#1e40af → #0f2847` | white |

`POSTER_MODE_MAX_LENGTH = 280` chars is the threshold between full-bleed "poster" and header-only "banner" rendering.

## 9. Interaction/UX Notes for a Planner

- All primary layout state (search, category filter, active nav) is synced to the URL via `react-router-dom`'s `useSearchParams`, not local-only state — deep-linkable.
- Session/auth state comes from Firebase (`SessionContext`), not custom JWT; UI must handle a `firebaseReady` loading gate before the shell/routes render (currently a plain centered "Loading..." text — a candidate for a nicer branded loading state).
- Unread notification polling is a fixed interval (10s) — no websockets/live push currently.
- Dark mode is a pure CSS-variable flip (`[data-theme="dark"]`) — any new component should be built with tokens only, no hardcoded colors, to remain theme-safe.
- Mobile breakpoints exist (1024/768/480/360px) but the 3-column desktop grid is the primary authored experience; mobile treatment (drawers) should be reviewed/tested for completeness when planning new UI.

## 10. Suggested Areas to Revisit (for planning discussion)

- Loading state for the initial Firebase auth check is unstyled plain text — could adopt the paper/cork motif.
- The bulletin-board/tape/stamp motif is currently only lightly used (chips, cards) — there's room to lean further into it (e.g., pinned/featured posts using literal pushpin icon + `--shadow-pin`).
- Right sidebar ("Community") and left sidebar (nav/categories) are both fixed-width and always-visible on desktop; confirm this remains desired as the member/post count scales.
- Post theme presets (gradients) are visually disconnected from the cork/paper aesthetic — worth deciding if themed posts should get a paper/tape frame around the gradient for consistency.
