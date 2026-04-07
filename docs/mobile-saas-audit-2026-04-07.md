# Mobile SaaS Audit Report

Date: 2026-04-07  
Scope: mobile version audit for SaaS web app (`ScholarshipTop`)  
Format: no source code changes, only findings and recommendations

## 1) Executive Summary

The current mobile implementation is generally mature: responsive Tailwind breakpoints are used consistently, critical UI flows are mobile-first, dialogs/overlays are present for complex interactions, and many controls include ARIA attributes.

Main risks are concentrated in:
- accessibility contrast and focus consistency;
- touch target sizes in several compact controls;
- potential horizontal overflow/occlusion in floating filter/sort panels on narrow screens;
- performance volatility on mobile (dynamic SSR + auth/session work in key paths);
- form semantics (field types/autocomplete/inputmode) that can degrade mobile keyboard UX.

Priority recommendation: focus first on accessibility and input ergonomics (high impact, low risk), then mobile performance hardening and overlay behavior QA across real devices.

---

## 2) Methodology and Tools

### Used
- Code-level responsive/accessibility/interaction audit (`app/**`, `components/**`, global styles).
- Structural review of existing internal audits:
  - `docs/rendering-caching-audit.md`
  - `docs/seo-pages.md`
  - `docs/MY_SCHOLARSHIPS_AUDIT.md`
- Local runtime checks in dev mode for navigation and modal behavior.
- Lighthouse mobile runs for key routes with JSON export:
  - `docs/lighthouse-mobile-home.json`
  - `docs/lighthouse-mobile-scholarships.json`
  - `docs/lighthouse-mobile-resources.json`
  - `docs/lighthouse-mobile-signin.json`

### Limitation
- Lighthouse CLI had intermittent Windows temp cleanup errors (`EPERM`) after run completion.  
- JSON reports were still generated and used for this audit, but for production-grade baselining it is recommended to rerun 3 times per route on staging.

## 2.1 Lighthouse Mobile Snapshot

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 71 | 96 | 100 | 100 | 0.93s | 6.81s | 100ms | 0.000 |
| `/scholarships` | 67 | 96 | 100 | 66 | 1.06s | 6.19s | 176ms | 0.000 |
| `/resources` | 75 | 96 | 100 | 100 | 0.93s | 7.96s | 68ms | 0.000 |
| `/signin/password_signin` | 74 | 100 | 100 | 63 | 1.06s | 7.24s | 151ms | 0.000 |

Interpretation:
- Performance is **medium** on mobile (67-75), with elevated LCP on all tested routes.
- Accessibility is **strong baseline** (96-100), but still requires manual screen-reader/touch target checks.
- SEO is notably lower on dynamic/auth routes (`/scholarships`, `/signin` redirect target), so metadata/indexability intent should be reviewed per business rules.

---

## 3) Audit Results by Requirement

## 3.1 Adaptive Design

### 3.1.1 Rendering on different devices

Observed:
- Mobile breakpoints are broadly applied (`sm`, `md`, `lg`) across key UI blocks.
- Main navigation includes dedicated mobile drawer (`lg:hidden`) and safe-area handling (`env(safe-area-inset-top)`).
- Large filter/category panels use viewport-aware positioning (`measurePanel`, `measureCategoryPanel`) and max width/height constraints.
- No restrictive custom viewport policy is found (no `user-scalable=no`, no `maximum-scale=1`), reducing zoom-related accessibility risk.

Risks:
- Multiple floating panels are `fixed` with dynamic coordinates and `z-index` layers; on small-height phones, control rows may visually crowd and partially hide contextual elements.
- Some containers use compact paddings and text sizes at mobile widths, which may reduce readability in bright outdoor conditions.

### 3.1.2 UI visibility and overlap

Observed:
- Modals and overlays use full-screen backdrops and controlled body scroll locking.
- Navbar sticky layer (`z-[100]`) is lower than dialog layers (`z-[200..300]`), so primary dialogs should stay on top.

Risks:
- Centered modal titles with absolute positioning can collide with edge controls on narrow widths and long localized strings.
- Dropdowns with `max-w-[min(calc(100vw-2rem),18rem)]` are safer than fixed width, but dense option text can still truncate early.

### 3.1.3 Screen-space efficiency

Observed:
- Compact control bars, chips, and collapsible drawers are used appropriately.
- Horizontal scrolling for chips exists where needed (e.g., category chips with `overflow-x-auto` in content hub).

Risks:
- Several controls are visually dense; discoverability can drop for first-time users.
- “Filter + Categories + Sort + search” cluster in one block can feel crowded on 320-360px devices.

---

## 3.2 UX Audit

### 3.2.1 Mobile navigation

Strengths:
- Hamburger menu with clear open/close state and Escape handling.
- Backdrop click to dismiss is implemented.
- Route change auto-closes menu.

Issues:
- Some link/button targets are near minimum comfort size; not all consistently meet ~44x44px guideline.
- Dense nav text with multiple levels (About + nested links) can increase mis-tap probability.

### 3.2.2 Mobile performance/loading behavior

Strengths:
- Existing architecture already separates some guest-cacheable API behavior.
- Static informational pages exist for part of content.

Risks:
- Key app routes remain mostly dynamic with auth/session checks and middleware session refresh, which increases TTFB variance on mobile networks.
- Heavy interactive sections in scholarship listing (filters/sidebar/cards) can increase main-thread pressure on low-end devices.

### 3.2.3 Mobile input/forms usability

Strengths:
- Form controls generally use full-width layout on small screens.
- Focus styles are present for many inputs and buttons.

Issues:
- Some email fields are `type="text"` instead of `type="email"` in account form variants, reducing mobile keyboard optimization and native validation hints.
- Numeric filters rely on number inputs + range sliders; on small screens this is usable but still error-prone for precise entry.
- Compact input controls may be difficult for users with large touch areas.

---

## 3.3 Accessibility Audit

### 3.3.1 Screen reader and semantic accessibility

Strengths:
- ARIA labels and roles are present in many dialogs/listboxes/buttons.
- Skip link exists in navbar.
- `aria-current`, `aria-modal`, and explicit labels are used in important places.

Risks:
- Not all custom interactive compositions appear to have complete keyboard+screen-reader parity (e.g., custom dropdown/listbox patterns should be validated against expected key behavior).
- Some tooltip-dependent context may be less useful on touch + screen reader combinations.

### 3.3.2 Contrast and readability

Likely issues:
- Repeated use of light gray text tones (e.g., `text-gray-400`, `text-zinc-500` on white backgrounds) may fail WCAG contrast for body-sized text.
- Secondary metadata labels in cards/lists may be hard to read on sunlight/low-brightness screens.

### 3.3.3 Focus behavior on mobile

Observed:
- Global focus reset removes default `:focus` outlines and reintroduces styles for `:focus-visible`.

Risk:
- This strategy is workable but fragile: if any component misses `focus-visible` coverage, keyboard/switch users can lose visible focus cues.

---

## 3.4 Functional/Interactive Audit

Observed:
- Interactive elements (menu, filters modal, sidebar tabs, sort dropdown, toasts) are implemented with explicit state and dismissal logic.
- Toasts are mobile-aware (`w-full` at top; desktop repositioning in larger breakpoints).

Risks:
- Multi-layer overlays/popovers in scholarship and resources toolbars can create edge cases (tap outside, scroll+reposition race, occluded controls).
- Gated actions (guest/subscription locks) are clear visually, but repetitive lock interactions may feel like dead-ends if conversion CTA flow is not immediate.

Notifications/popups:
- Toast container appears safe for mobile, but should be validated against:
  - virtual keyboard open state;
  - notch/safe-area devices;
  - stacked toasts overlapping critical top actions.

---

## 4) Prioritized Problem List

## P1 (High)
1. **Potential contrast failures in secondary text**
   - Impact: readability + WCAG risk.
   - Area: cards, helper texts, metadata labels.

2. **Inconsistent touch target comfort**
   - Impact: mis-taps and slower navigation for mobile users.
   - Area: compact pagination/toolbar controls, dense nav rows.

3. **Performance variability on dynamic mobile routes**
   - Impact: slower first interaction on weak networks/devices.
   - Area: `/`, `/scholarships`, auth-aware routes.

## P2 (Medium)
4. **Custom popover/listbox interaction edge cases**
   - Impact: occasional UX regressions on small viewports and assistive tech.
   - Area: sort/category/filter floating panels.

5. **Form semantic optimization gaps**
   - Impact: weaker mobile keyboard UX and native validation hints.
   - Area: account email forms and numeric-heavy filter controls.

## P3 (Low)
6. **Visual density in control bars**
   - Impact: cognitive load for first-time users.
   - Area: scholarship/resource listing toolbars on narrow screens.

---

## 5) Recommendations (No Code Changes Required Right Now)

## 5.1 Design and Responsiveness
- Define and enforce a mobile QA matrix for 320/360/390/412 widths and 667/740/844/915 heights.
- Add explicit visual QA checklist for overlap states: open nav + modal, modal + keyboard, dropdown near viewport edges.
- Validate all key components at 200% zoom and dynamic text scaling modes.

## 5.2 UX
- Adopt a touch target acceptance rule: primary interactive controls should meet at least 44x44 CSS px equivalent.
- Run critical user journey timing checks on “Slow 4G + 4x CPU slowdown” profile for:
  - home -> scholarships list;
  - filters open/apply;
  - sign-in flow.
- Track conversion friction in gated interactions (guest/subscription lock click -> CTA completion).

## 5.3 Accessibility
- Run contrast audit against WCAG AA for all text < 18px equivalent.
- Conduct screen-reader smoke tests on mobile:
  - iOS VoiceOver (Safari),
  - Android TalkBack (Chrome).
- Validate keyboard/switch navigation for custom listbox/dialog controls with a short checklist:
  - visible focus always present,
  - Escape closes overlays,
  - logical reading/order of controls,
  - clear spoken labels.

## 5.4 Functionality
- Build an interaction regression checklist for each release:
  - nav drawer,
  - filter modal,
  - sort/category popovers,
  - pagination,
  - toast/notification overlays.
- Verify orientation changes (portrait/landscape) with open overlays and active keyboard.

---

## 6) Lighthouse and DevTools Execution Plan

When environment permissions are fixed, run:

1. **Lighthouse mobile** on:
   - `/`
   - `/scholarships`
   - `/resources`
   - `/signin`
2. Collect:
   - Performance
   - Accessibility
   - Best Practices
   - SEO
3. Capture 3 runs per route and average scores to avoid one-off noise.
4. Store JSON/HTML reports in `docs/` for trend comparison.

If CLI still fails on local Windows temp permissions:
- Run Lighthouse from Chrome DevTools GUI or PageSpeed Insights on a staging URL.
- Keep one baseline snapshot per release.

---

## 7) Real Device Test Matrix (Recommended)

Minimum:
- iPhone 12/13/14 class (390x844)
- iPhone SE class (375x667)
- Android 360x800 class
- Tablet 768x1024 class

Scenarios:
- cold load on cellular profile,
- auth and non-auth states,
- filters + sort + pagination,
- sign-in and account form input,
- screen reader enabled,
- landscape orientation.

---

## 8) Estimated Timeline (3-5 Days)

- Day 1: full emulator sweep + baseline issue log.
- Day 2: real-device functional + UX checks.
- Day 3: accessibility pass (contrast + screen reader + focus flow).
- Day 4: Lighthouse reruns + performance analysis.
- Day 5: final prioritization and stakeholder-ready recommendations.

---

## 9) Deliverables

1. This report (`docs/mobile-saas-audit-2026-04-07.md`).
2. Prioritized issue register (P1/P2/P3) with reproducible scenarios.
3. Actionable recommendations that do not require immediate source code changes.
4. Optional follow-up: implementation-ready backlog if engineering changes are approved.
