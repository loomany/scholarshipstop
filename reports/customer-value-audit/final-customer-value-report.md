# Final customer-value report (Stages 0–7)

**Scope:** Product and data assessment only. No code, UI, API, database, paywall, or Google automation changes were made as part of this document.

**Audience:** Founders / growth / product — honest view of whether the grant marketplace and subscription can justify paid traffic.

---

## 1. Executive summary

**Verdict — site value:** **Yes.** The site addresses a real job-to-be-done (discover and narrow scholarships), guest flows work at a basic level (pages 200, cards visible, CTAs present), and the data sample suggests most listings are actionable after pay.

**Verdict — subscription:** **Yes, with caveats.** Application-readiness sampling (Stage 5) supports selling access: **95%** of sampled rows fell into **ready_to_apply** or **usable_but_needs_check**, with **strong_paid_content** as the automated label. The subscription **offer** is only partly convincing (Stage 4): pricing and benefits exist, but post-payment value is not spelled out as clearly as it could be, and trust builders (trial, guarantee, FAQ) are thin.

**Main risk:** **Trust + clarity at checkout** meets **data hygiene**: ~**70%** of sampled rows lack a strong official/program-style URL signal, ~**25%** are expired in sample metrics, and Stage 6 suggests a **large minority** of rows may be **Google-replaceable** by title/provider queries until manual SERP checks prove otherwise.

**Main growth lever:** **Sharpen the paid promise** (“exact apply links, full eligibility, saved grants, reminders, matching”) while **cleaning expired rows and strengthening canonical/provider URLs** so paid unlock feels obviously richer than free search.

---

## 2. Scorecard (0–100)

Scores are **judgment calls** derived from audit artifacts (Stages 1–6), not a single automated formula.

| Dimension | Score | Notes |
|-----------|------:|--------|
| **Data quality** | **74** | Strong density of apply URLs and deadlines in sample; hurt by expired share (~24.7%), weak official/program URL coverage (~70.2%), and known duplicate/trash flags from quality pipelines. |
| **Paid content usefulness** | **86** | Stage 5: **78.4%** ready_to_apply, **16.6%** usable, **5%** weak; **0%** “not subscription worthy” in sample; verdict **strong_paid_content**. |
| **Application readiness** | **83** | Aligns with Stage 5 ready + usable **95%**; residual friction from thin eligibility (~19.1% in Stage 5 summary), URL gaps, and expired noise. |
| **Paywall security** | **94** | Stage 2: **SAFE** — premium URL fields not leaked to guest API/network; `premiumFieldsRedacted: true`; blur is presentation-layer; still avoid encouraging “inspect element” as a trust narrative. |
| **Filter / customer experience** | **73** | Stage 3: core filters work; warnings on deadline URL sync, STEM → 0 with Education fallback, geo-chip noise on keyword queries. |
| **Subscription offer clarity** | **72** | Stage 4: **conversionReadinessScore 80**, **valueModel balanced**, but weak on explicit after-pay deliverables, trial/guarantee/FAQ. |
| **Google replaceability risk** | **62** | Stage 6 (heuristic only, **no SERP run**): **high 63**, **medium 62**, **low 75** out of **200** rows → **62.5%** high+medium. Higher score = **more** rows where free Google might recreate the listing *if* manual checks confirm. |
| **Overall subscription viability** | **80** | **Strong subscription candidate** contingent on clearer offer + data cleanup; security posture supports paid fields. |

---

## 3. Stage-by-stage findings (0–6)

| Stage | What was checked | Headline result | Risk / note |
|-------|------------------|-----------------|-------------|
| **0** | Code map: cards, blur/paywall, API, subscription, filters | Baseline for scoped audits | Use map to avoid accidental scope creep later |
| **1** | Guest browser audit | Key pages **200**; cards, lock/blur, subscription CTA visible; no broad 404/500 | `/recommended` empty for guest; `/account` → sign-in |
| **2** | Blur / paywall security | **SAFE**: no premium URL leakage to guest network/API | Blur is visual; don’t oversell “encryption” of titles |
| **3** | Filters (customer) | Main filters work; combined Education + US OK | Deadline preset **URL** may not reflect `deadline=gt4w`; STEM **0** → Education fallback; `q=STEM` geo chips (India/Spain) confusing |
| **4** | Subscription value | **Balanced** model; conversion readiness **80** | Missing explicit trial/guarantee/FAQ; unclear **exactly** what unlocks after pay |
| **5** | DB application readiness (SELECT-only, n=2500) | **strong_paid_content**; **95%** ready+usable | **70.2%** weak official/program URL; **24.7%** expired; **19.1%** thin eligibility |
| **6** | Google discoverability **CSV only** (200 rows) | Query strings prepared; **no** Google HTTP | **63** high / **62** medium / **75** low heuristic risk — **validate manually** |

---

## 4. Can a paid user actually apply?

**Answer: Partially — leaning strongly toward “yes” for most listings.**

- **~78.4%** of the Stage 5 sample scored **ready_to_apply** (user can plausibly follow links and next steps).
- **~16.6%** **usable_but_needs_check** (useful but may require confirming details off-platform).
- **~5%** **weak_paid_value** (thin paid case for those exact rows).
- **~95%** combined ready + usable implies **most paid sessions** should encounter listings that support real applications **if** navigation and freshness hold in production.

**What gets in the way:**

1. **Official / program URL gap (~70.2%)** — users may rely on aggregator or generic portal pages; still workable but weaker “trust anchor.”
2. **Expired (~24.7%)** in sample metrics — hurts trust and wastes time if surfaced prominently.
3. **Thin eligibility (~19.1%)** — user may need extra clicks or guesswork even after unlock.

---

## 5. Paywall / security verdict

- **Blur:** Visible styling can still be read or inspected in DevTools (expected for client-side UI). That is **not** the security boundary.
- **API / network:** Stage 2 concluded guest responses **do not** expose premium URL fields; **`premiumFieldsRedacted: true`** on detail paths; no evidence of critical premium URLs in guest API payloads.
- **Verdict:** **SAFE** for the audited threat model (guest vs paid field separation).
- **Still improve:** Defense in depth (rate limits, abuse monitoring), consistent redaction across **all** endpoints, and user-facing copy that sets expectations without claiming impossible DRM.

---

## 6. Free vs paid balance

**Classification: Balanced — but value communication is somewhat unclear.**

Stage 4 labeled the model **balanced** with **conversionReadinessScore 80**. Technically the split can be balanced while **messaging** under-explains the paid tier. Risk is not “too open” or “too locked” globally — it is **unclear post-pay value** relative to free teaser + Google.

---

## 7. Google replaceability

- **Yes, for some grants:** Stage 6 prepared **200** manual queries across major aggregators; **heuristic** risk split (**high/medium/low**) implies **many** rows might be rediscoverable via search **if** titles + providers are distinctive and listings exist on public aggregators.
- **Manual verification required:** No SERP scraping was performed; CSV is a **work queue**, not evidence of rankings.

**Where the product still wins vs Google:**

- Time saved (structured catalog, less tab chaos)
- **Filters / facets** and profile-aware flows
- **Deduping**, noise reduction, expired handling (when executed well)
- **Saved lists**, reminders, checkpoints, essay/no-essay signals **if** productized reliably
- Consistent **apply_url** surfacing post-pay even when user started from search elsewhere

**Fields to avoid giving away too freely when replaceability is high (after manual confirmation):**

- Exact **apply_url** / official destination URL
- Full **provider** contact and deep program pages
- Long **eligibility / requirements / steps** blocks
- Strong **match explanation** and ranked “best for you” beyond a short teaser

---

## 8. What should be free (teaser)

Recommendations (policy — not implementation):

- **Title** or slightly redacted title only when replaceability tests show instant 1:1 hits
- **Provider** partial or full depending on per-source replaceability tests
- **Deadline** (date or coarse bucket)
- **Award** amount text when available
- **1–2 eligibility chips** (high level: country, level, broad category)
- **Short snippet** (summary line), not full narrative
- **Why matched** in **one sentence**, not full reasoning / checklist
- **Limited card count** + clear upgrade path

---

## 9. What should be paid

Recommendations:

- **apply_url** and canonical **official / program** URLs
- Full **description**, application instructions, long eligibility
- **Full match rationale**, ranking signals, comparisons
- **Saved / export**, queues, progress tracking
- **Alerts / deadline reminders**
- **AI checklist / drafting aids** (when allowed by policy)
- **Easy-apply / no-essay** shortcuts **after validation**
- **Top recommendations** beyond a small preview (e.g. full recommended feed)

---

## 10. Top 10 problems (synthesized)

1. **~24.7% expired** rows in Stage 5 sample — erodes trust and conversion if prominent.
2. **~70.2%** weak official/program URL signal — weaker “this is real” anchor post-click.
3. **Unclear after-payment promise** (Stage 4) — user may hesitate at paywall.
4. **No strong trial / guarantee / FAQ** — friction for first purchase.
5. **Guest `/recommended` empty** — missed habit loop for anonymous users.
6. **Deadline filter URL mismatch risk** — users can’t share/bookmark exact deadline state.
7. **STEM relevance issue** (0 results, Education fallback) — perceived broken search.
8. **Keyword ↔ geo chip confusion** (`q=STEM` showing unrelated geo chips) — looks like a bug to users.
9. **Google replaceability** (Stage 6 heuristics: **125/200** high+medium) — needs manual confirmation but flags pricing pressure on “URL-only” value prop.
10. **Duplicate / trash / suspicious flags** from scholarship quality pipelines — if surfaced to users, damages premium positioning.

---

## 11. Top 10 recommended fixes (no code in this doc)

### A. Quick wins (~1 day)

1. **Copy pass on subscription page:** bullet list of **exact unlocks** after pay (URLs, full detail, saves, reminders).
2. **Micro-FAQ** (even 5 Qs): refunds, what’s locked, cancellation, data sources.
3. **Guest empty states:** explain why `/recommended` is empty and single CTA (quiz / sign-in / sample list).
4. **STEM / keyword UX:** tooltip or fallback message when broad STEM returns 0 (“try field filters…”).
5. **Deadline filter:** confirm URL/query sync or add UI note “filters applied” when URL lags.

### B. ~1 week

6. **Expired suppression rules** in ranking/surfacing (product + data ops), not just DB counts.
7. **Provider URL enrichment** playbook for top sources / top trafficked rows.
8. **Manual completion** of Stage 6 CSV sample → decide **teaser rules per source**.
9. **Trust bundle:** guarantee or transparent refund policy; optional short trial if economics work.
10. **Analytics events** on paywall unlock attempts, save click, filter confusion (instrumentation — separate approval).

### C. ~1 month

11. **Data quality program:** duplicates, trash, refresh cadence, official URL sourcing at scale.
12. **Personalization moat:** saved pipeline + reminders + checklist becomes default narrative vs “raw links.”
13. **Search relevance:** fix STEM/geo chip coupling; re-test combined filters.
14. **Segment paywall:** stricter teaser for high-replaceability grants once validated.
15. **Continuous Stage 5-style audits** after major ingest changes.

---

## 12. Final verdict

**Classification:** **Strong subscription candidate — needs clearer offer and data cleanup.**

**Plain English:**

- The **security model** for premium fields is **fit for purpose** (Stage 2).
- The **dataset**, in aggregate, **supports paid access** to application-critical fields (Stage 5).
- The **biggest commercial gaps** are **messaging** (what exactly changes after pay) and **freshness/canonical URL hygiene**, not “is there any paid value.”
- **Google** can substitute part of the catalog for savvy users — the business case must emphasize **workflow, speed, filtering, trust, and persistence** (saved + reminders + checklists), not “secret URLs nobody can find.”

---

## Cursor handoff checklist

- **Artifact:** `reports/customer-value-audit/final-customer-value-report.md`
- **Do not** commit or push unless explicitly approved.
- **Next optional step:** Run manual Google checks using `google-check-queries.csv`, then tighten teaser policy by source/risk tier.

---

*Generated as Stage 7 synthesis; aligns with user-provided stage summaries and report paths under `reports/customer-value-audit/`.*
