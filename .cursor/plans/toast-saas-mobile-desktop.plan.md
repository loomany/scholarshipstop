# Toast: SaaS-блок на мобильных и на ПК

## Проблема

- **Мобильные:** текст и кнопка в одной строке (`flex` + `justify-between`) — заголовок и описание сжаты слева, переносы короткими строками.
- **ПК:** [`ToastViewport`](components/ui/Toasts/toast.tsx) ограничен `sm:max-w-[min(420px,calc(100vw-2rem))]`, при этом в строке ещё и зелёная кнопка — колонка текста получается очень узкой, заголовок ломается на 3–4 короткие строки; кнопка с `items-start` прижата к верху и визуально «не в блоке».

## Подход

Всё централизовано в [`components/ui/Toasts/toast.tsx`](components/ui/Toasts/toast.tsx) и [`components/ui/Toasts/toaster.tsx`](components/ui/Toasts/toaster.tsx). Один раз — единый стиль для всех `toast()` (в т.ч. confirm из [`ScholarshipsEmailConfirmationBanner.tsx`](components/scholarships/ScholarshipsEmailConfirmationBanner.tsx)).

### Мобильный (по умолчанию)

- Корневой `Toast`: `flex-col gap-3` — сначала текст на **полную ширину**, ниже CTA (полная ширина кнопки).
- [`ToastAction`](components/ui/Toasts/toast.tsx): `w-full sm:w-auto`, при необходимости комфортная высота тапа на малых экранах.

### ПК (`sm:` и выше)

- **Ширина «карточки»:** увеличить лимит viewport, например с `420px` до **~520–560px** (`min(560px, calc(100vw-2rem))` или близко), чтобы заголовок и описание не ломались из‑за узкой колонки рядом с кнопкой.
- **Раскладка строки:** `sm:flex-row sm:items-center sm:justify-between sm:gap-4` — текст слева с `min-w-0 flex-1`, кнопка справа **по вертикали по центру** относительно блока текста (типичный SaaS alert).
- **Полировка:** чуть больший внутренний отступ на `sm:` (`p-5`) и/или `rounded-xl`, если совпадёт с остальными карточками продукта — без смены палитры `warning`.

### Текст

- В [`toaster.tsx`](components/ui/Toasts/toaster.tsx): обёртка title/description — `w-full min-w-0`.
- Опционально: `text-balance` на заголовке на `sm+` для более ровных переносов (проверить длинные строки).

## Файлы

| Файл | Изменения |
|------|-----------|
| [`toast.tsx`](components/ui/Toasts/toast.tsx) | Адаптивный flex у `toastVariants`; при необходимости padding/radius на `sm:`; `ToastViewport` — новый `max-w` на `sm:`; базовые классы `ToastAction`. |
| [`toaster.tsx`](components/ui/Toasts/toaster.tsx) | `min-w-0 w-full` у блока текста; опционально `text-balance` на title. |

## Проверка

- Узкий viewport: колонка, полная ширина текста, кнопка снизу на всю ширину.
- Широкий экран: карточка шире ~520px+, заголовок читается в 1–2 строки где уместно, кнопка выровнена по центру блока по вертикали.
- Toast без `action`: не появляется пустая полоса; крестик закрытия не перекрывает контент.

## Todos

- [x] `toastVariants`: колонка на мобильных, строка + `items-center` на `sm+`
- [x] `ToastViewport`: увеличить `max-w` на десктопе
- [x] `ToastAction`: `w-full sm:w-auto`, при необходимости высота тапа на мобильных
- [x] `toaster.tsx`: обёртка текста `w-full min-w-0`, опционально `text-balance`
- [x] Визуальная проверка mobile + desktop (с action и без) — проверить в браузере локально
