# Content Hub Service

Автономный worker-сервис для генерации SEO-статей и изображений с сохранением в Supabase.

## Что делает сервис

- Берет тему из `content_topics` (статус `queued`).
- Генерирует SEO brief через OpenAI.
- Генерирует статью 1100+ слов с перелинковкой (scholarships, FAQ, related articles).
- Генерирует cover image через FAL **FLUX.1 [dev]** (`fal-ai/flux/dev`; размер запроса задаётся `FLUX_HERO_WIDTH` / `FLUX_HERO_HEIGHT`, по умолчанию 704×396).
- Загружает изображение в Supabase Storage (`content-images`) и сохраняет public URL.
- Валидирует контент и сохраняет пост в `content_posts`.
- Обновляет статус темы в `done` или `failed`.

## Структура

```text
/src
  /lib
    openai.ts
    fal.ts
    extractImageUrlFromFalJson.ts
    supabase.ts
    prompts.ts
    validators.ts
    links.ts
    related.ts
    markdown.ts
    html.ts
    logger.ts
    types.ts

  /jobs
    runContentJob.ts

  /scripts
    seedTopics.ts

  /config
    env.ts
```

## Setup

1. Установить зависимости:

```bash
npm install
```

2. Создать `.env` на основе `.env.example`.

3. Применить SQL из `supabase/schema.sql` в Supabase SQL Editor.

4. (Опционально) засеять темы:

```bash
npm run seed:topics
```

## Запуск worker

```bash
npm run content:run-once
```

## Railway

- Service name: `content-hub-worker`
- Start command: `npm run content:run-once`
- Cron (один вариант):
  - `0 */8 * * *`
- Cron (альтернатива, UTC):
  - `0 9 * * *`
  - `0 15 * * *`
  - `0 21 * * *`

## Скрипты

```json
{
  "scripts": {
    "content:run-once": "tsx src/jobs/runContentJob.ts",
    "seed:topics": "tsx src/scripts/seedTopics.ts"
  }
}
```

## Post-publish matching trigger

Если `CONTENT_ARTICLE_MATCH_SECRET` задан, worker после публикации вызывает внутренний endpoint сайта `POST /api/internal/resources/apply-article-matching` (по `slug` или `postId`). Это покрывает event-driven сценарий «сразу после publish» без дублирования пайплайна матчинга в worker.

## Логирование

Worker пишет ключевые стадии:
- topic picked
- seo generated
- article generated
- validation passed
- image generated
- uploaded
- post saved
- done

## Важно

- Не публикует (`published`) при `CONTENT_HUB_AUTO_PUBLISH=0`; ставит `review_needed`.
- При любой ошибке тема переводится в `failed` и не остается в `processing`.
