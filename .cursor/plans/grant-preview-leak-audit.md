# Grant preview leak audit (living doc)

## Дополнение: 10 «сложных» грантов со ссылками

В репозитории **нет выгрузки каталога** с полями `title` / `provider_name` / `summary_short` — только небольшой мок [data/scholarships.json](data/scholarships.json). Реальные гранты в таблице `public.scholarships` (см. [types_db.ts](types_db.ts)).

### Как получить ровно 10 из вашей БД (рекомендуется)

Выполните в **Supabase SQL Editor** и подставьте свой `NEXT_PUBLIC_SITE_URL` в ссылки:

**9 «сложных»** — `provider_name` входит в `title` (частый Google-fingerprint):

```sql
SELECT
  id,
  coalesce(nullif(trim(slug), ''), id) AS path_segment,
  title,
  provider_name
FROM scholarships
WHERE coalesce(is_active, true)
  AND provider_name IS NOT NULL
  AND trim(provider_name) <> ''
  AND title IS NOT NULL
  AND lower(title) LIKE '%' || lower(trim(provider_name)) || '%'
ORDER BY length(trim(provider_name)) DESC, random()
LIMIT 9;
```

**1 «лёгкий»** — провайдер **не** в заголовке, но **есть** в кратком описании:

```sql
SELECT
  id,
  coalesce(nullif(trim(slug), ''), id) AS path_segment,
  title,
  provider_name,
  left(summary_short, 120) AS summary_preview
FROM scholarships
WHERE coalesce(is_active, true)
  AND provider_name IS NOT NULL
  AND trim(provider_name) <> ''
  AND title IS NOT NULL
  AND summary_short IS NOT NULL
  AND lower(title) NOT LIKE '%' || lower(trim(provider_name)) || '%'
  AND lower(summary_short) LIKE '%' || lower(trim(provider_name)) || '%'
ORDER BY random()
LIMIT 1;
```

Ссылка на карточку в приложении (как в коде):  
`{NEXT_PUBLIC_SITE_URL}/scholarships/{encodeURIComponent(path_segment)}`

Опционально в SQL сразу собрать URL (подставьте хост):

```sql
SELECT
  'https://scholarshiptop.com/scholarships/'
    || coalesce(nullif(trim(slug), ''), id) AS public_url_hint,
  id,
  coalesce(nullif(trim(slug), ''), id) AS path_segment,
  title,
  provider_name
FROM scholarships
WHERE coalesce(is_active, true)
  AND provider_name IS NOT NULL
  AND trim(provider_name) <> ''
  AND title IS NOT NULL
  AND lower(title) LIKE '%' || lower(trim(provider_name)) || '%'
ORDER BY length(trim(provider_name)) DESC, random()
LIMIT 9;
```

(`public_url_hint` — черновик; в приложении путь кодируется как `encodeURIComponent` в JS; при необычных символах в `slug` сверяйте с тем, как строит URL [scholarshipPublicPath](app/scholarships/scholarshipsData.ts).)

---

### Важно: почему вы видите 404 на scholarshiptop.com

Таблица ниже — **идентификаторы из файла [data/scholarships.json](data/scholarships.json)** (демо/документация). Они **не обязаны** существовать в вашей таблице `public.scholarships` на проде.  
Поэтому `https://scholarshiptop.com/scholarships/lester-b-pearson-scholarship` и аналогичные **ожидаемо дают «Page not found»** — это не баг маршрутизации, а **несовпадение slug с каталогом**.

Для реальных ссылок используйте только **`path_segment` / `public_url` из SQL выше** по вашей БД.

---

### Пример из мока (только иллюстрация типов кейсов — на проде не открывать, будет 404)

База в таблице ниже указана как scholarshiptop.com для наглядности; **на живом сайте эти пути, скорее всего, не существуют**.

| # | Сложность | Почему | URL |
|---|-------------|--------|-----|
| 1 | Лёгкий | В названии нет «University of Toronto», зато в описании есть | https://scholarshiptop.com/scholarships/lester-b-pearson-scholarship |
| 2 | Сложный | Бренд программы в title | https://scholarshiptop.com/scholarships/fulbright-foreign-student-program |
| 3 | Сложный | Donor + institution в названии | https://scholarshiptop.com/scholarships/knight-hennessy-scholars |
| 4 | Сложный | Университет в названии (UBC) | https://scholarshiptop.com/scholarships/ubc-international-scholars |
| 5 | Сложный | Именной бренд в title | https://scholarshiptop.com/scholarships/gates-cambridge-scholarship |
| 6 | Сложный | Сильный бренд в title | https://scholarshiptop.com/scholarships/rhodes-scholarship |
| 7 | Сложный | Госпрограмма в title | https://scholarshiptop.com/scholarships/chevening-scholarships |
| 8 | Сложный | Именная программа + страна в title | https://scholarshiptop.com/scholarships/vanier-canada-graduate-scholarships |
| 9 | Сложный | Госпрограмма в title | https://scholarshiptop.com/scholarships/australia-awards-scholarships |
| 10 | Сложный | Организация в названии (AAUW) | https://scholarshiptop.com/scholarships/aauw-international-fellowships |

После прогона SQL пришлите 10 строк (`path_segment` + кратко да/нет) — зафиксируем политику блюра под ваши реальные кейсы.
