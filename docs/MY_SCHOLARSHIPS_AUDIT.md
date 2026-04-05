# My Scholarships flow audit (code-level)

Date: 2026-04-05

## Key factual findings

1. Hub listing is now catalog-only on server path.
   - `scholarshipListRequestFromParts` hard-sets `listScope: 'catalog'`.
   - `applyCatalogOnlyListingNormalization` rewrites `best-matches` / `recommended` / `easy-apply` to `matches`.

2. Sidebar counts are mixed-source on client:
   - `bestMatches` / `recommended` from `/api/scholarships/match` (`countsUnfiltered`, minus ignored only).
   - `matches` often forced to current `totalCount` for browse tabs.
   - `saved` / `ignored` / `started` / `submitted` from local id array lengths.

3. Main left list comes from `POST /api/scholarships` and does a fresh fetch on URL/filter changes.

4. Filters open a modal panel, stored in component state, serialized to JSON in POST body (`moreFilters`), not fully in URL (only `deadline` is mirrored).

5. Server applies filters in SQL (`applyCommonFilters` + `applyMoreFilters` + tab scope).

## Why count mismatches can happen

- Personalized sidebar counts (`best/recommended`) are computed from match-index buckets and do not include search/category/moreFilters from current view.
- Sidebar `saved/ignored` are local array lengths, not filtered SQL counts.
- `matches` may be overridden by current list `totalCount` in browse tabs.

## Risky / fragile spots

- Dual count systems (match index vs SQL/meta vs local arrays) create UX ambiguity.
- Tab semantics are partially legacy in UI labels, but server normalizes personalized tabs to catalog `matches`.
- Deadline is duplicated in URL and moreFilters baseline merge logic; drift is possible.

## Match score и bucket split (Best / Recommended)

### Где считается score

- Основной расчёт выполняет `matchScholarship(profile, row)` в `lib/scholarships/scholarshipMatch.ts`.
- Эта функция возвращает объект `{ score, reasons }`.
- Счёт называется именно `score` внутри match-index pipeline; позже при merge в карточку поле становится `matchScore`.

### Формула score (фактически)

Старт: `score = 0`.

Плюсы:
- Field of study exact/contains match: `+30`.
- Если у пользователя есть field, а у scholarship поле не задано: `+12`.
- School level token match: `+25`.
- Если у пользователя есть school level, а у scholarship уровни не заданы: `+8`.
- Citizenship match: `+20`.
- Если citizenship у scholarship не задан, а у пользователя задан: `+10`.
- GPA >= min requirement: `+15`.
- Если min GPA не задан, а GPA пользователя есть: `+6`.
- State soft-match: `+10`.
- Open eligibility (нет field/citizenship/gpa_min ограничений): `+10`.

Минусы:
- hard citizenship mismatch: `-18`, но не ниже 0 (`Math.max(0, score - 18)`).

Финал:
- `score = Math.min(100, Math.round(score))`.

### Что НЕ входит в score

В текущей реализации `matchScholarship` не учитывает:
- keyword/text match,
- award amount,
- deadline,
- popularity/applicants,
- provider credibility/ranking.

`lib/scholarships/matchScore.ts` содержит отдельные `MATCH_SCORE_WEIGHTS`, но это placeholder и в runtime pipeline не используется.

### Bucket pipeline: profile -> scoring -> ranking -> split

1. Для каждой активной scholarship загружается `MATCH_SCORE_SELECT`.
2. Для каждой строки вызывается `matchScholarship` => `{ score, reasons }`.
3. Результаты сохраняются в `byId`.
4. `sortedPositive` = только записи с `score > 0`, сортировка по убыванию score.
5. `idsBest`:
   - базовый strong порог `STRONG_BEST_MIN = 63`;
   - если strong-кандидатов >= 5 -> берутся первые до 24;
   - иначе fallback: top-K из `sortedPositive`, где
     `K = min(max(6, ceil(30% positive)), 18, positiveCount)`.
6. `idsRecommended`:
   - сначала из оставшихся (не в best) с `score >= 28`;
   - если таких < 8, fallback: любые оставшиеся после best;
   - финальный срез до 80.
7. `idsMatches` = все `score >= 10`.
8. `idsEasy` = easy-apply флаг/эвристика, потом сортировка по score desc.

### Чем Best отличается от Recommended по факту

- Оба bucket'а строятся на одном и том же `score`.
- Отличие только в правилах разреза:
  - Best: более высокий порог (`>=63`) + fallback top-N при малом числе strong.
  - Recommended: оставшиеся после Best, обычно от `>=28`, но есть fallback на любые оставшиеся.

Это не разные scoring-модели; это разные диапазоны/срезы одного score + fallback-эвристики.

### Где score используется дальше

- В match-index API (`/api/scholarships/match`) для ранжирования bucket-выдачи и возврата reasons.
- В `mergeMatchOntoScholarships` score/reasons мапятся в поля карточки `matchScore`/`matchReasons`.
- В основном hub-list (`/api/scholarships`) score сейчас не используется для сортировки, т.к. listing pipeline catalog-only.
