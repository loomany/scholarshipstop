"""One-off audit: slug churn / phantom scholarship URLs. Not part of app."""
from __future__ import annotations

import hashlib
import json
import re
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_env_local() -> dict[str, str]:
    env: dict[str, str] = {}
    path = ROOT / ".env.local"
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip().strip('"').strip("'")
        env[k] = v
    return env


def slugify(title: str, suffix: str) -> str:
    t = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")[:72]
    suf = re.sub(r"[^a-z0-9]+", "-", (suffix or "").lower()).strip("-")[:32]
    if t and suf:
        out = f"{t}-{suf}"
    elif t:
        out = t
    elif suf:
        out = f"scholarship-{suf}"
    else:
        h = hashlib.sha256((title or "x").encode()).hexdigest()[:10]
        out = f"scholarship-{h}"
    return out[:120]


def expected_slug(title: str | None, source_id: str | None, record_url: str | None) -> str:
    sid = (source_id or "").strip()
    suf = sid if sid else hashlib.md5((record_url or "").encode()).hexdigest()[:12]
    return slugify(title or "Scholarship", suf)


def parse_dt(s: str | None) -> datetime | None:
    if not s:
        return None
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def supabase_paginate(base_url: str, key: str, table: str, select: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 1000
    while True:
        path = (
            f"{base_url}/rest/v1/{table}"
            f"?select={select}&order=created_at.asc&offset={offset}&limit={page}"
        )
        req = urllib.request.Request(
            path,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            batch = json.load(resp)
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def supabase_filter(base_url: str, key: str, table: str, select: str, filt: str) -> list[dict]:
    rows: list[dict] = []
    offset = 0
    page = 1000
    while True:
        path = (
            f"{base_url}/rest/v1/{table}"
            f"?select={select}&{filt}&offset={offset}&limit={page}"
        )
        req = urllib.request.Request(
            path,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            batch = json.load(resp)
        if not batch:
            break
        rows.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return rows


def http_status(url: str) -> int | None:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "ScholarshipTop-Audit/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None


def main() -> None:
    env = load_env_local()
    base = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    site = env.get("NEXT_PUBLIC_SITE_URL", "https://scholarshiptop.com").rstrip("/")
    if not base or not key:
        raise SystemExit("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")

    cols = "id,source,source_id,slug,title,url,created_at,updated_at,is_active,is_indexable"
    rows = supabase_paginate(base, key, "scholarships", cols)

    late_by_source: Counter[str] = Counter()
    late_rows: list[dict] = []
    slug_mismatch: list[dict] = []
    suffix_ne_source_id: list[dict] = []

    for r in rows:
        src = (r.get("source") or "").strip() or "(empty)"
        created = parse_dt(r.get("created_at"))
        updated = parse_dt(r.get("updated_at"))
        delta = (updated - created).total_seconds() if created and updated else 0
        act = (r.get("slug") or "").strip()
        exp = expected_slug(r.get("title"), r.get("source_id"), r.get("url"))
        sid = (r.get("source_id") or "").strip()

        if act and exp and act != exp:
            slug_mismatch.append({**r, "expected_slug": exp})

        if sid and act and not act.endswith(sid):
            suffix_ne_source_id.append(r)

        if delta > 180:
            late_rows.append(r)
            late_by_source[src] += 1

    active_slugs = {
        (r.get("slug") or "").strip()
        for r in rows
        if (r.get("slug") or "").strip()
    }
    site = site.rstrip("/")

    # Indexing queue
    qrows = supabase_filter(
        base,
        key,
        "google_indexing_queue",
        "url,status,added_at,source",
        "content_kind=eq.scholarship",
    )
    queue_404: list[dict] = []
    queue_ok = 0
    # HEAD only a bounded sample — full queue can be huge.
    queue_sample = qrows[:200]
    for q in queue_sample:
        u = (q.get("url") or "").strip()
        if not u.startswith("http"):
            continue
        st = http_status(u)
        if st == 404:
            queue_404.append({**q, "http_status": st})
        elif st and 200 <= st < 400:
            queue_ok += 1

    queue_orphan_slug: list[dict] = []
    for q in qrows:
        u = (q.get("url") or "").strip()
        if not u.startswith(site + "/scholarships/"):
            continue
        seg = u[len(site) :].split("/scholarships/", 1)[-1].split("?")[0]
        if seg and seg not in active_slugs:
            queue_orphan_slug.append(q)

    # Sample: unigo late updates with alternate slug reconstruction
    unigo_late = [
        r
        for r in late_rows
        if (r.get("source") or "") == "unigo"
    ]

    out = {
        "audited_at": datetime.now(timezone.utc).isoformat(),
        "total_scholarships": len(rows),
        "late_update_gt_3min": len(late_rows),
        "late_update_pct": round(100 * len(late_rows) / max(1, len(rows)), 3),
        "late_update_by_source": dict(late_by_source.most_common(20)),
        "slug_mismatch_current_fields": len(slug_mismatch),
        "slug_suffix_ne_source_id": len(suffix_ne_source_id),
        "unigo_total": sum(1 for r in rows if (r.get("source") or "") == "unigo"),
        "unigo_late_gt_3min": len(unigo_late),
        "indexing_queue_scholarship_urls": len(qrows),
        "indexing_queue_404_in_sample": len(queue_404),
        "indexing_queue_2xx_in_sample": queue_ok,
        "indexing_queue_http_sample_size": len(queue_sample),
        "indexing_queue_orphan_slug_urls": len(queue_orphan_slug),
    }

    print(json.dumps(out, indent=2, ensure_ascii=False))

    if queue_orphan_slug:
        print("\n--- queue URLs whose slug is not in catalog (max 30) ---")
        for q in queue_orphan_slug[:30]:
            print(q.get("url"), q.get("status"), q.get("source"))

    if queue_404:
        print("\n--- indexing_queue 404 URLs in HTTP sample (max 30) ---")
        for q in queue_404[:30]:
            print(q.get("url"), q.get("status"), q.get("source"))

    if unigo_late:
        print("\n--- unigo late updates (all) ---")
        for r in unigo_late:
            created = r.get("created_at")
            updated = r.get("updated_at")
            print(
                f"  {r.get('slug')} | source_id={r.get('source_id')} | "
                f"created={created} updated={updated}"
            )

    report_path = ROOT / "reports" / "slug-phantom-url-audit.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        json.dumps(
            {
                **out,
                "queue_orphan_slug_samples": queue_orphan_slug[:200],
                "queue_404_samples": queue_404[:100],
                "slug_mismatch_samples": slug_mismatch[:50],
                "suffix_ne_source_id_samples": suffix_ne_source_id[:50],
                "unigo_late_rows": unigo_late,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"\nWrote {report_path}")


if __name__ == "__main__":
    main()
