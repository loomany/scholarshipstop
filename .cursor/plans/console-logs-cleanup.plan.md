---
name: Console logs cleanup
overview: "Точечно убрать dev-шум и ворнинг useInsertionEffect: sidebar deferred state, убрать CTA-спам, dev-only CLIENT KEY, PWA meta в root layout."
todos:
  - id: sidebar-deferred-sync
    content: "ScholarshipsSidebar.tsx — обернуть тело `syncFromLocation` в `setTimeout(() => { ... }, 0)` (или `requestAnimationFrame`) так, чтобы `setPathname`/`setSearchParams` не вызывались синхронно из патча history во время фазы, конфликтующей с useInsertionEffect (Next Router)."
  - id: cta-log-remove
    content: "useScholarshipEntryHref.ts — удалить или закомментировать `console.info` с текстом 'unresolved guest quiz completion' (ветка guest_missing_quiz)."
  - id: client-key-dev
    content: "ScholarshipsHubPageClient.tsx ~1936 — обернуть `console.log('CLIENT KEY:', ...)` в `if (process.env.NODE_ENV === 'development')`."
  - id: pwa-mobile-meta
    content: "app/layout.tsx — в `export const metadata` в блоке `other` добавить `'mobile-web-app-capable': 'yes'` (рядом с `msapplication-TileColor`). Не удалять `appleWebApp` без отдельной проверки в Safari; цель — убрать предупреждение Chromium о missing modern tag."
---

# Console logs / warnings — итерация плана (точечные правки)

## 1. [components/scholarships/ScholarshipsSidebar.tsx](components/scholarships/ScholarshipsSidebar.tsx)

**Проблема:** `syncFromLocation` вызывается из подмены `pushState`/`replaceState` и сразу делает `setState`, что пересекается с фазой, где `next/navigation` использует `useInsertionEffect` → ворнинг *useInsertionEffect must not schedule updates*.

**Правка:** внутри `syncFromLocation` (или оборачивая всю функцию при вызове из `originalPushState` / `originalReplaceState` / начального `syncFromLocation` и `popstate`) вынести обновления в макротаск: **`setTimeout(() => { setPathname(...); setSearchParams(...); }, 0)`** (пользователь предпочитает; альтернатива — `requestAnimationFrame`).

**Заметка:** `syncFromLocation` при `useEffect` initial тоже должен идти через тот же deferred путь, чтобы поведение было единообразным.

## 2. [components/navigation/useScholarshipEntryHref.ts](components/navigation/useScholarshipEntryHref.ts)

**Правка:** удалить или закомментировать блок `console.info('[scholarship-entry-cta] unresolved guest quiz completion')` (строки ~25–27), оставив логику `resolveScholarshipEntryDecisionClient` без изменений.

## 3. [app/scholarships/ScholarshipsHubPageClient.tsx](app/scholarships/ScholarshipsHubPageClient.tsx)

**Правка:** строка ~1936, `console.log('CLIENT KEY:', hubListRequestKey)` — обернуть в `if (process.env.NODE_ENV === 'development') { ... }`.

**Заметка:** в клиентском бандле `process.env.NODE_ENV` обычно заинлайнится; это ожидаемо для dev-only логов.

## 4. [app/layout.tsx](app/layout.tsx) (root)

**Контекст:** в репо нет сырой строки `apple-mobile-web-app-capable`; тег, скорее всего, **эмитит** Next из `metadata.appleWebApp` (см. строки 82–85). Предупреждение браузера просит **добавить** `mobile-web-app-capable`.

**Правка:** расширить `metadata.other`:

- Уже есть: `'msapplication-TileColor': '#000000'`
- **Добавить:** `'mobile-web-app-capable': 'yes'` (значения meta — строки, как в MDN/whatwg)

Не заменять агрессивно `appleWebApp` без ручной проверки PWA/Add to Home на iOS.

---

## Оценка подхода (кратко)

| Решение | Оценка |
|--------|--------|
| `setTimeout(0)` для sidebar state | Разумно: стандартный способ вынести setState из синхронного callback истории. |
| `requestAnimationFrame` | Допустимо: чуть позже в пайплайне, обычно тоже снимает ворнинг. |
| Убрать CTA `console.info` | Соответствует цели убрать шум. |
| Dev-only CLIENT KEY | Соответствует. |
| `mobile-web-app-capable` в `metadata.other` | Соответствует рекомендации Chromium; совместим с существующим `appleWebApp`. |

**Выполнение кода** — по явной команде пользователя из чата (например «делай» / «implement»), после чего — прогон dev и проверка консоли на `/scholarships`.
