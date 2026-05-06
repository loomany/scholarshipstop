# Stage 4 — Subscription & value proposition audit

- **Generated:** 2026-05-05T23:54:36.650Z
- **Base URL:** http://localhost:3001
- **Value model (heuristic):** **balanced**

## Scorecard (0–100)

| Metric | Score |
|--------|-------|
| Offer clarity | 100 |
| Paid value clarity | 90 |
| Trust | 65 |
| CTA strength | 66 |
| Free vs paid balance | 72 |
| Conversion readiness | 80 |

### Score rationale

- **offerClarityScore:** Based on H1 presence, number of plan headings, visible currency amounts, and billing cadence copy.
- **paidValueClarityScore:** Weighted by concrete benefit lines (unlock/unblur/IQ/essay/alerts) vs vague wording only.
- **trustScore:** MoR/payment processor mention, billing clarity, visible cancel/resume hooks, any trial/guarantee wording.
- **ctaStrengthScore:** Primary plan CTAs on /subscription plus density of subscription destinations on hub listings and sign-in.
- **freeVsPaidBalanceScore:** Combines paywall-related word density (unlock/premium/subscribe/locked, incl. “unlocked”) with presence of /subscription links on listings and sign-in.
- **conversionReadinessScore:** Weighted blend of clarity, paid-value articulation, trust, CTA visibility, and free/paid balance.

## /subscription (primary)

- **HTTP status:** 200
- **Title:** ScholarshipTop | Unlock Premium Precision
- **H1:** Unlock Premium Precision
- **Visible pricing:** $14.99, $9.66, $29, $7.40, $89
- **Billing copy:** Billed $14.99 every month. | Billed $29 every 3 months. | Billed $89 every year.
- **Trial / guarantee wording:** —
- **Plan titles:** Monthly | Quarterly | Yearly
- **CTA buttons:** Start Plan
- **Benefits (sample):** Unlock Premium Scholarships · Unlock IQ Strategy Report · Access "Easy Apply" & "International" · Unblur all grant names & links · Unlimited Smart Filters · Everything in Monthly, plus: · Unlock AI Essay Mentor · IQ-based grant strategy + essay next steps · Smart Interview & Voice Input · Unlimited essay generations · Instant email alerts for new matches · Save 35% compared to monthly · Everything in Quarterly, plus: · Full IQ report with matched grants, awards, and deadlines · Best price per month · Priority AI processing
- **FAQ (detected):** —
- **Trust elements:** Payments processed by Lemon Squeezy / Merchant of Record copy present.
- **Cancellation wording (if visible):** —
- **After-payment hints (visible):** —
- **Unclear / missing promises:**
  - No explicit trial length, money-back, or guarantee wording visible in the pricing section (guest view).
  - No dedicated “what happens immediately after checkout” paragraph beyond feature bullets.
  - No FAQ section detected in visible subscription copy.
- **Screenshot:** `reports/customer-value-audit/screenshots/subscription-page.png`

## Listing & hub pages (CTA / locked value copy)

### /scholarships

- HTTP: 200 · Title: ScholarshipTop | Find Scholarships That Match Your Profile
- Lock-related token hits (body): 3 (body length 6222)
- Links to subscription: [Pricing](http://localhost:3001/subscription)
- Sample sentences mentioning unlock/premium/subscribe:
  - Scholarship strategy unlocked

Start IQ test
Fintech Innovation Scholarship
For a Bright Future Foundation
NEW
Fintech Innovation Scholarship

For a Bright Future Foundation offers this scholarship to help cover educatio
  - Scholarship strategy unlocked

Start IQ test
Single Parent Household Scholarship
For a Bright Future Foundation
NEW
Single Parent Household Scholarship

For a Bright Future Foundation offers this scholarship to help cove
  - Scholarship strategy unlocked

Start IQ test

Page 1 of 1915

Previous
1
2
3
4
5
6
7
8
9
10
…
1915
Next
FAQ
How are scholarship matches selected?
- **Screenshot:** `reports/customer-value-audit/screenshots/subscription-hub-scholarships.png`

### /scholarships/hub/best-matches

- HTTP: 200 · Title: ScholarshipTop | Find Scholarships
- Lock-related token hits (body): 3 (body length 5273)
- Links to subscription: [Pricing](http://localhost:3001/subscription)
- Sample sentences mentioning unlock/premium/subscribe:
  - Scholarship strategy unlocked

Start IQ test
Fintech Innovation Scholarship
For a Bright Future Foundation
NEW
Fintech Innovation Scholarship

For a Bright Future Foundation offers this scholarship to help cover educatio
  - Scholarship strategy unlocked

Start IQ test
Single Parent Household Scholarship
For a Bright Future Foundation
NEW
Single Parent Household Scholarship

For a Bright Future Foundation offers this scholarship to help cove
  - Scholarship strategy unlocked

Start IQ test

Page 1 of 1915

Previous
1
2
3
4
5
6
7
8
9
10
…
1915
Next
My scholarships
Best recommendation
Loading scholarship count
Easy apply
Loading scholarship count
Hot Deadlines
Loa
- **Screenshot:** `reports/customer-value-audit/screenshots/subscription-hub-best-matches.png`

### /scholarships/hub/easy-apply

- HTTP: 200 · Title: ScholarshipTop | Easy Apply Scholarships
- Lock-related token hits (body): 3 (body length 7061)
- Links to subscription: [Pricing](http://localhost:3001/subscription)
- Sample sentences mentioning unlock/premium/subscribe:
  - Scholarship strategy unlocked

Start IQ test
$10,000 "No Essay" Scholarship
Scholarships360
VERIFIED
NEW
$10,000 "No Essay" Scholarship

Scholarships360 offers this scholarship to help cover education costs.
  - Scholarship strategy unlocked

Start IQ test
Epilepsy Foundation of San Diego County College Scholarship
Epilepsy Foundation of San Diego County
NEW
Epilepsy Foundation of San Diego County College Scholarship

Epilepsy F
  - Scholarship strategy unlocked

Start IQ test

Page 1 of 43

Previous
1
2
3
4
5
6
7
8
9
10
…
43
Next
FAQ
What does easy apply mean for scholarships?
- **Screenshot:** `reports/customer-value-audit/screenshots/subscription-hub-easy-apply.png`

### /scholarships/hub/recommended

- HTTP: 200 · Title: ScholarshipTop | Find Scholarships
- Lock-related token hits (body): 0 (body length 770)
- Links to subscription: [Pricing](http://localhost:3001/subscription)
- Sample sentences mentioning unlock/premium/subscribe:
- **Screenshot:** `reports/customer-value-audit/screenshots/subscription-hub-recommended.png`

## /signin

- HTTP: 200 · ScholarshipTop | Sign in
- Subscription-related links: 1
- **Screenshot:** `reports/customer-value-audit/screenshots/subscription-signin.png`

---

## Клиентские вопросы (отчёт)

1. **Понятно ли клиенту, за что платить?** Да: на странице видны планы (Monthly, Quarterly, Yearly), суммы ($14.99, $9.66, $29, $7.40) и список выгод. Оговорка: у гостя CTA ведут в сценарий с аккаунтом (см. продукт), мгновенный checkout на этой странице не обязателен.
2. **Не выглядит ли подписка слишком абстрактной?** В значительной степени **нет** — буллеты вроде «Unblur», «Easy Apply», «IQ / Essay» конкретизируют. Слабое место — нет отдельного нарратива «после оплаты» (см. unclear/missing).
3. **Есть ли обещание конкретного результата?** Обещается **доступ к продукту** (инструменты, отчёты, разблокировка), а не исход вроде «обязательно получите грант» — это плюс для ожиданий; не стоит сдвигать в гарантии исхода.
4. **Риск не понять, что получишь после оплаты?** **Умеренный** (в видимом блоке почти нет шагов после checkout; детали в основном в списке features).
5. **Что сильное?** Сетка тарифов, ясные цены/биллинг, сильные benefit-строки, упоминание MoR/платёжного провайдера.
6. **Что слабое?** Нет явного trial / guarantee в гостевом виде. Нет FAQ в DOM. Нет видимой копии про отмену на гостевом экране (нормально, если только в портале). Поведение paywall на листингах оценивайте по сэмплам фраз и ссылкам «Pricing».
7. **5 правок для конверсии (предложения, без правок кода в этом этапе):** (1) Блок «Сразу после оплаты: 3 шага». (2) Одна строка про trial/отмену/период списания. (3) Мини-FAQ: возвраты, что в «Premium Scholarships», как отменить. (4) Соц-доверие (без ложных цифр). (5) Единый месседж на листингах: «что откроется» vs «что остаётся free».
8. **Чего нельзя обещать:** гарантированный грант/визу/приём; фиксированный денежный результат; «полный» доступ к данным провайдера в обход правил; снятие eligibility-ограничений.