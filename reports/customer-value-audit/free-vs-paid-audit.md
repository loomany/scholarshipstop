# Free vs paid balance (Stage 4)

- **Generated:** 2026-05-05T23:54:36.650Z
- **Model:** balanced
- **Free vs paid balance score:** 72/100

Эвристика: на страницах листинга и hub посчитана плотность упоминаний unlock/premium/subscribe/subscription/upgrade/locked в видимом тексте, плюс наличие ссылок на `/subscription`. Это не точная метрика UX, а сигнал для сравнения страниц между собой.

| Path | Lock-related hits | Body chars | Subscription links |
|------|-------------------:|----------:|-------------------:|
| /scholarships | 3 | 6222 | 1 |
| /scholarships/hub/best-matches | 3 | 5273 | 1 |
| /scholarships/hub/easy-apply | 3 | 7061 | 1 |
| /scholarships/hub/recommended | 0 | 770 | 1 |

## Вывод

**Сбалансированная** модель по эвристике: есть и заметные платные офферы на `/subscription`, и разумная частота paywall-копирайта на листингах.

_Исправления не вносятся на этом этапе — только наблюдения для продукта и копирайта._