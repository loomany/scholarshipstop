"""
Утилиты для работы с Supabase и стипендиями.
Максимально простой код для новичков.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Mapping
from urllib.parse import quote

from supabase import Client, create_client

from scholarship_db_columns import SCHOLARSHIP_UPSERT_PAYLOAD_KEYS

# Имена переменных окружения (как в Supabase Dashboard → Settings → API)
ENV_URL = "SUPABASE_URL"
ENV_KEY = "SUPABASE_SERVICE_ROLE_KEY"
UUID_LIKE_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def get_client() -> Client:
    """
    Создаёт клиент Supabase с правами service_role (обходит RLS).
    Ключ храни только на сервере / в .env, никогда не коммить в git.
    """
    url = os.environ.get(ENV_URL, "").strip()
    key = os.environ.get(ENV_KEY, "").strip()
    if not url or not key:
        raise RuntimeError(
            f"Задай переменные окружения {ENV_URL} и {ENV_KEY} "
            "(например в файле parsers/.env или в системе)."
        )
    return create_client(url, key)


def _norm_text(value: Any) -> str:
    """None → пустая строка; иначе str, lower, trim, лишние пробелы схлопнуть."""
    if value is None:
        return ""
    s = str(value).strip().lower()
    return " ".join(s.split())


def build_text_fingerprint(record: Mapping[str, Any]) -> str:
    """
    Отпечаток для дедупликации (уровень 3 в БД).
    Берём поля, нормализуем, склеиваем, считаем SHA-256 (hex).
    """
    parts = [
        _norm_text(record.get("source")),
        _norm_text(record.get("title")),
        _norm_text(record.get("provider_name")),
        _norm_text(record.get("award_amount_text")),
        _norm_text(record.get("deadline_text")),
    ]
    joined = "|".join(parts)
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    """Время в ISO для timestamptz (UTC)."""
    return datetime.now(timezone.utc).isoformat()


def _site_origin() -> str:
    raw = os.environ.get("NEXT_PUBLIC_SITE_URL", "").strip()
    if not raw:
        return "https://scholarshiptop.com"
    raw = raw.rstrip("/")
    return raw if raw.startswith("http") else f"https://{raw}"


def scholarship_public_url(row: Mapping[str, Any]) -> str:
    row_id = str(row.get("id") or "").strip()
    slug = str(row.get("slug") or "").strip()
    if slug and not UUID_LIKE_RE.match(slug):
        suffix = quote(slug, safe="")
    else:
        suffix = row_id
    if not suffix:
        raise ValueError("Нельзя построить публичный URL без id или slug")
    return f"{_site_origin()}/scholarships/{suffix}"


def add_to_indexing_queue(url: str) -> None:
    """Enqueue URL for Google Indexing flush (Supabase table ``google_indexing_queue``)."""
    raw = str(url).strip()
    if not raw:
        return

    client = get_client()
    now = _now_iso()
    prev = (
        client.table("google_indexing_queue")
        .select("attempt_count")
        .eq("url", raw)
        .limit(1)
        .execute()
    )
    rows = prev.data or []
    attempt_count = int(rows[0]["attempt_count"]) if rows else 0

    client.table("google_indexing_queue").upsert(
        {
            "url": raw,
            "status": "pending",
            "added_at": now,
            "notification_type": "URL_UPDATED",
            "content_kind": "scholarship",
            "source": "parser:scholarships:new",
            "attempt_count": attempt_count,
            "last_error": None,
        },
        on_conflict="url",
    ).execute()


def _find_id_by_source_url(client: Client, source: str, url: str) -> str | None:
    res = (
        client.table("scholarships")
        .select("id")
        .eq("source", source)
        .eq("url", url)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0]["id"] if rows else None


def _find_id_by_source_source_id(
    client: Client, source: str, source_id: str
) -> str | None:
    res = (
        client.table("scholarships")
        .select("id")
        .eq("source", source)
        .eq("source_id", source_id)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0]["id"] if rows else None


@dataclass
class KnownScholarshipIndex:
    """In-memory ключи существующих строк для source (быстрый skip на листинге)."""

    source_ids: set[str] = field(default_factory=set)
    urls: set[str] = field(default_factory=set)
    slugs_lc: set[str] = field(default_factory=set)
    titles_norm: set[str] = field(default_factory=set)


def load_known_scholarship_index(client: Client, source: str) -> KnownScholarshipIndex:
    """
    Загрузить source_id, url, slug, title для source одним или несколькими range-запросами.
    """
    idx = KnownScholarshipIndex()
    batch = 1000
    offset = 0
    src = str(source).strip()
    while True:
        res = (
            client.table("scholarships")
            .select("source_id,url,slug,title")
            .eq("source", src)
            .range(offset, offset + batch - 1)
            .execute()
        )
        rows = res.data or []
        for row in rows:
            sid = row.get("source_id")
            if sid is not None and str(sid).strip() != "":
                idx.source_ids.add(str(sid).strip())
            u = row.get("url")
            if u is not None and str(u).strip() != "":
                idx.urls.add(str(u).strip())
            sl = row.get("slug")
            if sl is not None and str(sl).strip() != "":
                idx.slugs_lc.add(str(sl).strip().lower())
            tit = row.get("title")
            if tit is not None and str(tit).strip() != "":
                tn = _norm_text(tit)
                if len(tn) >= 12:
                    idx.titles_norm.add(tn)
        if len(rows) < batch:
            break
        offset += batch
    return idx


def listing_is_known(
    list_data: Mapping[str, Any],
    idx: KnownScholarshipIndex,
    *,
    title_fallback: bool = False,
) -> bool:
    """
    Уже есть в БД? Порядок: source_id → url → slug (нормализованный) → опционально title.
    """
    url = str(list_data.get("url") or "").strip()
    sid = str(list_data.get("source_id") or "").strip()
    if sid and sid in idx.source_ids:
        return True
    if url and url in idx.urls:
        return True
    if sid:
        sdl = sid.lower()
        if sdl in idx.slugs_lc:
            return True
    if title_fallback:
        tn = _norm_text(list_data.get("title"))
        if len(tn) >= 12 and tn in idx.titles_norm:
            return True
    return False


def _find_id_by_source_fingerprint(
    client: Client, source: str, fingerprint: str
) -> str | None:
    res = (
        client.table("scholarships")
        .select("id")
        .eq("source", source)
        .eq("text_fingerprint", fingerprint)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0]["id"] if rows else None


# Поля, которые нельзя массово передавать в update (id задаётся в .eq)
_SKIP_ON_WRITE = frozenset({"id"})


def _merge_seo_tags_for_upsert(
    existing: object | None,
    incoming: object | None,
) -> list[str]:
    """
    Union DB + payload seo_tags; dedupe case-insensitively.
    Incoming (parser) values are listed first so their casing wins on collisions.
    """
    incoming_list: list[str] = []
    if isinstance(incoming, list):
        incoming_list = [str(x) for x in incoming if isinstance(x, str) and x.strip()]
    existing_list: list[str] = []
    if isinstance(existing, list):
        existing_list = [str(x) for x in existing if isinstance(x, str) and x.strip()]
    seen: set[str] = set()
    out: list[str] = []
    for t in incoming_list + existing_list:
        tl = t.strip()
        if not tl:
            continue
        kl = tl.lower()
        if kl in seen:
            continue
        seen.add(kl)
        out.append(tl)
    return out


def upsert_scholarship(record: Mapping[str, Any]) -> dict[str, Any]:
    """
    Записать стипендию с логикой дедупликации:

    1) source + url
    2) иначе source + source_id (если source_id не пустой)
    3) иначе source + text_fingerprint (считаем сами через build_text_fingerprint)
    4) иначе INSERT

    Если строка найдена — UPDATE всех полей из record + last_seen_at (+ text_fingerprint).
    Поле updated_at в БД обновит триггер; last_seen_at задаём явно.
    """
    if "source" not in record or "url" not in record or "title" not in record:
        raise ValueError("В record обязательны ключи: source, url, title")

    client = get_client()
    source = str(record["source"]).strip()
    url = str(record["url"]).strip()
    fingerprint = build_text_fingerprint(record)

    row_id: str | None = _find_id_by_source_url(client, source, url)

    if row_id is None:
        sid = record.get("source_id")
        if sid is not None and str(sid).strip() != "":
            row_id = _find_id_by_source_source_id(
                client, source, str(sid).strip()
            )

    if row_id is None:
        row_id = _find_id_by_source_fingerprint(client, source, fingerprint)

    now = _now_iso()
    raw_row = {k: v for k, v in dict(record).items() if k not in _SKIP_ON_WRITE}
    unknown = set(raw_row) - SCHOLARSHIP_UPSERT_PAYLOAD_KEYS
    if unknown:
        raise ValueError(
            "Неизвестные ключи в record (добавь колонку в БД и в "
            "scholarship_db_columns.SCHOLARSHIP_UPSERT_BODY_KEYS): "
            f"{sorted(unknown)}"
        )
    payload: dict[str, Any] = dict(raw_row)
    payload["source"] = source
    payload["url"] = url
    payload["text_fingerprint"] = fingerprint
    payload["last_seen_at"] = now

    if row_id is not None:
        res_prev = (
            client.table("scholarships")
            .select("seo_tags")
            .eq("id", row_id)
            .limit(1)
            .execute()
        )
        rows_prev = res_prev.data or []
        existing_tags = rows_prev[0].get("seo_tags") if rows_prev else None
        if "seo_tags" in payload:
            payload["seo_tags"] = _merge_seo_tags_for_upsert(
                existing_tags,
                payload.get("seo_tags"),
            )
        elif existing_tags is not None:
            payload["seo_tags"] = _merge_seo_tags_for_upsert(existing_tags, [])

    if row_id is None:
        # Новая запись (created_at / updated_at по умолчанию из БД)
        res = client.table("scholarships").insert(payload).execute()
        rows = res.data or []
        if not rows:
            check = (
                client.table("scholarships")
                .select("*")
                .eq("source", source)
                .eq("url", url)
                .limit(1)
                .execute()
            )
            rows = check.data or []
        if not rows:
            raise RuntimeError("INSERT не вернул строку: проверь ответ API и RLS.")
        inserted = rows[0]
        try:
            add_to_indexing_queue(scholarship_public_url(inserted))
        except Exception as exc:
            print(f"[indexing-queue] warning: failed to enqueue new scholarship: {exc}")
        return inserted

    # Обновление существующей
    res = (
        client.table("scholarships").update(payload).eq("id", row_id).execute()
    )
    rows = res.data or []
    if not rows:
        check = (
            client.table("scholarships")
            .select("*")
            .eq("id", row_id)
            .limit(1)
            .execute()
        )
        rows = check.data or []
    if not rows:
        raise RuntimeError("UPDATE не удалось подтвердить.")
    return rows[0]
