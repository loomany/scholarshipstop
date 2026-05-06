# Blur / paywall security audit (Stage 2 — guest)

## 1. Overall verdict

**SAFE** (network: safe, worst DOM page: safe)

Generated: 2026-05-05T23:25:50.883Z  
BASE_URL: http://localhost:3001

---

## 2. Pages checked

- /
- /scholarships
- /scholarships/hub/matches
- /scholarships/hub/best-matches
- /scholarships/hub/easy-apply
- /scholarships/hub/international-friendly
- /scholarships/hub/recommended

### Detail pages (guest)

- /scholarships/climate-stripes-scholarship-14487
- /scholarships/fintech-innovation-scholarship-8931
- /scholarships/vice-chancellor-s-scholarship-2905
- /scholarships/creative-arts-scholarship-8932
- /scholarships/china-university-of-petroleum-scholarship-1461

---

## 3. API responses inspected

Unique JSON endpoints captured: **6**  
(Includes explicit guest `fetch('/api/scholarships/:slug')` probes on detail pages — the React client often skips this request when SSR redacted payload is sufficient.)

- http://localhost:3001/api/scholarships
- http://localhost:3001/api/scholarships/climate-stripes-scholarship-14487
- http://localhost:3001/api/scholarships/fintech-innovation-scholarship-8931
- http://localhost:3001/api/scholarships/vice-chancellor-s-scholarship-2905
- http://localhost:3001/api/scholarships/creative-arts-scholarship-8932
- http://localhost:3001/api/scholarships/china-university-of-petroleum-scholarship-1461

---

## 4. Closed data in DOM / HTML

Heuristic: regex search on full `page.content()` for serialized sensitive keys with HTTPS URLs or emails.

| Path | DOM verdict | HTML sensitive hits (count) | Notes |
|------|-------------|------------------------------|-------|
| / | safe | 0 | — |
| /scholarships | safe | 0 | — |
| /scholarships/hub/matches | safe | 0 | — |
| /scholarships/hub/best-matches | safe | 0 | — |
| /scholarships/hub/easy-apply | safe | 0 | — |
| /scholarships/hub/international-friendly | safe | 0 | — |
| /scholarships/hub/recommended | safe | 0 | — |

### Detail pages

| Path | DOM verdict | HTML hits |
|------|-------------|-----------|
| /scholarships/climate-stripes-scholarship-14487 | safe | 0 |
| /scholarships/fintech-innovation-scholarship-8931 | safe | 0 |
| /scholarships/vice-chancellor-s-scholarship-2905 | safe | 0 |
| /scholarships/creative-arts-scholarship-8932 | safe | 0 |
| /scholarships/china-university-of-petroleum-scholarship-1461 | safe | 0 |

---

## 5. Closed data in page.content()

Same as §4 (full HTML string). Any non-empty **htmlRegexHits** below indicates embedded JSON-like secrets:

**Listing/home aggregate hits (sample):**

- _(none)_

---

## 6. Network / API leakage

**premiumFieldsRedacted** seen on **10** response(s).

**Leak paths detected (parsed JSON walk):**

- _(none)_

---

## 7. Bypass blur with DevTools?

- Blur/overlays often use `backdrop-blur` and still leave **innerText** on underlying nodes or on overlay wrappers.
- **innerText** on `article[data-scholarship-card]` typically includes visible card copy; DevTools can always read DOM text — this is **client-side obscuring**, not encryption.
- If apply URLs appear only in network JSON/HTML, users can read them in Network tab → classify as **critical** if guest receives them.

Sample blur-related nodes (first page with overlays):

- BUTTON filter=none innerTextLen=0 class=pointer-events-auto absolute top-1/2 z-[30] flex h-11 w-11 -translate-y-1/2 item
- BUTTON filter=none innerTextLen=0 class=pointer-events-auto absolute top-1/2 z-[30] flex h-11 w-11 -translate-y-1/2 item
- BUTTON filter=none innerTextLen=0 class=absolute bottom-3 left-3 z-10 flex h-11 w-11 items-center justify-center rounded
- BUTTON filter=none innerTextLen=0 class=pointer-events-auto absolute top-1/2 z-[30] flex h-11 w-11 -translate-y-1/2 item
- BUTTON filter=none innerTextLen=0 class=pointer-events-auto absolute top-1/2 z-[30] flex h-11 w-11 -translate-y-1/2 item
- DIV filter=none innerTextLen=26 class=pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-cen

---

## 8. Fields that may leak (from this audit)

- No structured leak paths detected in captured JSON.

HTML regex category hits aggregate:

- none

---

## 9. Fields that appear redacted / defensive

- JSON key **premiumFieldsRedacted: true** on detail responses (when present).
- Listing API uses restricted column sets server-side (see Stage 0 — `PUBLIC_LIST_CARD_SELECT`); confirm empirically in `blur-paywall-audit.json` captures.

---

## 10. Recommendations (no code changes in this task)

- Detail responses include premiumFieldsRedacted — ensure all sensitive keys are nulled consistently.

---

## Classification reminder

- **safe**: guest JSON/HTML/network lacks usable secret URLs/contacts for premium fields.
- **risky**: secrets appear only in obscured DOM or minor embeddings; or contacts partially exposed.
- **critical**: guest API or HTML contains apply/listing/provider URLs or clear premium payloads.

