# Application readiness audit (Stage 5)

- **Generated:** 2026-05-06T00:05:14.645Z
- **Sample size:** 2500
- **Verdict:** **strong_paid_content** (ready+usable = 95% of sample)
- **Mean readiness score:** 87.5

## Distribution

| Bucket | Count | % |
|--------|------:|--:|
| ready_to_apply | 1959 | 78.4 |
| usable_but_needs_check | 415 | 16.6 |
| weak_paid_value | 126 | 5 |
| not_subscription_worthy | 0 | 0 |

## Data gaps (sample)

- Missing apply_url **and** url: **0%**
- Missing official/provider-style URL (heuristic): **70.2%**
- Missing deadline: **0.5%**
- Missing award text: **0.4%**
- Thin eligibility signals: **19.1%**
- Thin location / host / scope: **7.5%**
- Expired (any rule): **24.7%**
- Deadline over 12 months ago: **0%**
- Description+summary under 100 chars: **0%**
- Duplicate-flagged (CSV): **10.3%**
- Trash/suspicious-flagged (CSV): **13.2%**

## Ответы (по ТЗ)

1. **Может ли платный пользователь реально податься?** Частично: **95%** строк в выборке попадают в ready+usable; остальное требует ручной проверки или не тянет paywall.
2. **% ready_to_apply:** **78.4%**
3. **% usable_but_needs_check:** **16.6%**
4. **% weak + not worthy:** **5%** (weak: 5, not worthy: 0)
5. **Сколько не стоит показывать за paywall?** Ориентир: **0** записей в классе not_subscription_worthy (0%) плюс часть weak_paid_value при продуктовых порогах.

6. **Сильные источники (по avg score, n≥5):**
   - wemakescholars: avg 98.4, ready 100%
   - daad: avg 97.3, ready 100%
   - bigfuture: avg 94, ready 93.5%
   - scholars4dev: avg 92.4, ready 84.3%
   - bold_org: avg 91.3, ready 88%
   - iefa: avg 91.2, ready 81.7%
   - scholarships360: avg 90.2, ready 94.6%
   - scholarship_america: avg 85.6, ready 87.6%
   - unigo: avg 80, ready 100%
   - scholarships_com: avg 73.1, ready 45.2%

7. **Слабые источники (низкий avg score, n≥5):**
   - mastersportal: avg 72.9, weak+worse 3.9%
   - scholarships_com: avg 73.1, weak+worse 17.1%
   - unigo: avg 80, weak+worse 0%
   - scholarship_america: avg 85.6, weak+worse 1%
   - scholarships360: avg 90.2, weak+worse 0%
   - iefa: avg 91.2, weak+worse 5.6%
   - bold_org: avg 91.3, weak+worse 3.8%
   - scholars4dev: avg 92.4, weak+worse 0%
   - bigfuture: avg 94, weak+worse 2.1%
   - daad: avg 97.3, weak+worse 0%

8. **Поля, чаще мешающие подаче:** отсутствие `apply_url`/`url`, отсутствие program `provider_url`, слабый `deadline_*`, короткие `description`/`summary_*`, пустые eligibility/location JSON.
9. **Что улучшить в данных:** добить официальные/program URLs, нормализовать дедлайны, расширить описания не-агрегаторных карточек, снизить долю expired/дубликатов в активном каталоге.

10. **Продавать подписку на текущей базе?** Да, с оговорками: при доле ready+usable ≥50% база **приемлема** для paid; при ≥70% — **сильнее**; ниже 50% — сначала качество данных.
11. **Что показывать бесплатно как teaser:** заголовок, краткий summary, дедлайн-бакет, страна/уровень на high-level, без прямых offsite apply ссылок (как у вас в paywall-модели).
12. **Что закрывать за подпиской:** полные apply URLs, provider контакты, длинные eligibility/requirements, IQ/essay AI блоки, smart filters — всё, что снижает ценность подписки если отдать бесплатно.

---

См. также: `application-readiness-summary.json`, `application-readiness-records.csv`.