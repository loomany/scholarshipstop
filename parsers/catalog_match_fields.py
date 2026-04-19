"""
Hub profile / SQL match fields inferred from plain text (same intent as TS
`lib/scholarships/catalogEnrichment/proposeScholarshipCatalogBackfill.ts`).

Mutates `record` during `apply_normalization` so every parser upsert carries
citizenship_statuses, education, field_of_study, GPA bucket, state_codes, location_tags.
"""

from __future__ import annotations

import re
from typing import Any

# Full state name (title case keys) → USPS (align with lib/constants/usStates + TS backfill).
_US_NAME_TO_CODE: dict[str, str] = {
    "Alabama": "AL",
    "Alaska": "AK",
    "Arizona": "AZ",
    "Arkansas": "AR",
    "California": "CA",
    "Colorado": "CO",
    "Connecticut": "CT",
    "Delaware": "DE",
    "Florida": "FL",
    "Georgia": "GA",
    "Hawaii": "HI",
    "Idaho": "ID",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kansas": "KS",
    "Kentucky": "KY",
    "Louisiana": "LA",
    "Maine": "ME",
    "Maryland": "MD",
    "Massachusetts": "MA",
    "Michigan": "MI",
    "Minnesota": "MN",
    "Mississippi": "MS",
    "Missouri": "MO",
    "Montana": "MT",
    "Nebraska": "NE",
    "Nevada": "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    "Ohio": "OH",
    "Oklahoma": "OK",
    "Oregon": "OR",
    "Pennsylvania": "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    "Tennessee": "TN",
    "Texas": "TX",
    "Utah": "UT",
    "Vermont": "VT",
    "Virginia": "VA",
    "Washington": "WA",
    "West Virginia": "WV",
    "Wisconsin": "WI",
    "Wyoming": "WY",
}


def _uniq_sorted_usps(xs: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for x in xs:
        t = str(x).strip().upper()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return sorted(out)


def _uniq_sorted_slugs(xs: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for x in xs:
        t = str(x).strip()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return sorted(out)


def _as_str_list(v: Any) -> list[str]:
    if not isinstance(v, list):
        return []
    return [str(x).strip() for x in v if isinstance(x, str) and str(x).strip()]


def _international_exclusive_blob(blob: str) -> bool:
    b = blob.lower()
    return bool(
        re.search(r"\bonly\s+(?:for\s+)?(?:non[-\s]?u\.?s\.?\s+)?(?:citizens?|nationals?)\b", b)
        or re.search(r"\bmust\s+not\s+be\s+(?:a\s+)?u\.?s\.?\s+citizen\b", b)
        or re.search(r"\bopen\s+only\s+to\s+international\s+students?\b", b)
        or re.search(r"\b(?:restricted|limited)\s+to\s+foreign\s+nationals?\b", b)
        or (
            re.search(r"\boutside\s+(?:the\s+)?united\s+states\b", b)
            and not re.search(r"\bu\.?s\.?\s+(?:citizen|resident|student)", b)
        )
    )


def infer_citizenship_statuses(blob: str) -> list[str]:
    if _international_exclusive_blob(blob):
        return []
    out: list[str] = []
    if re.search(r"\bu\.?s\.?\s+citizens?\b", blob, re.I) or re.search(
        r"\bcitizens?\s+of\s+the\s+united\s+states\b", blob, re.I
    ):
        out.append("us_citizen")
    if re.search(r"\b(?:u\.?s\.?\s+)?permanent\s+residents?\b", blob, re.I) or re.search(
        r"\bgreen\s+card\b", blob, re.I
    ):
        out.append("us_permanent_resident")
    if re.search(
        r"\bu\.?s\.?\s+citizens?\s+and\s+permanent\s+residents?\b", blob, re.I
    ) or re.search(
        r"\bcitizens?\s+or\s+permanent\s+residents?\s+of\s+the\s+united\s+states\b",
        blob,
        re.I,
    ):
        out.extend(["us_citizen", "us_permanent_resident"])
    if not out and (
        re.search(r"\bunited\s+states\s+(?:high\s+school|college|university|student)", blob, re.I)
        or re.search(
            r"\b(?:u\.?s\.?|us)\s+(?:high\s+school|undergraduate|graduate|college)\s+students?\b",
            blob,
            re.I,
        )
        or re.search(r"\battending\s+(?:a\s+)?(?:u\.?s\.?|us|united\s+states)\s+", blob, re.I)
    ):
        out.append("us")
    return _uniq_sorted_slugs(out)


_EDU_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bhigh\s+school\s+seniors?\b", re.I), "high_school_senior"),
    (re.compile(r"\bhigh\s+school\b", re.I), "high_school"),
    (re.compile(r"\bundergraduates?\b|\bcollege\s+students?\b|\bbachelor'?s?\b", re.I), "undergraduate"),
    (re.compile(r"\bgraduate\s+students?\b|\bmasters?\b|\bmba\b", re.I), "graduate"),
    (re.compile(r"\bphd\b|\bdoctoral\b", re.I), "phd"),
    (re.compile(r"\bcommunity\s+college\b", re.I), "community_college"),
    (re.compile(r"\btrade\s+school\b|\bvocational\b", re.I), "trade_school"),
]


def infer_catalog_education_level_ids(blob: str) -> list[str]:
    found: list[str] = []
    for pat, sid in _EDU_RULES:
        if pat.search(blob):
            found.append(sid)
    return _uniq_sorted_slugs(found)


def study_levels_labels_from_ids(ids: list[str]) -> list[str]:
    labels: list[str] = []
    for sid in ids:
        if sid in ("high_school", "high_school_senior"):
            labels.append("High school")
        elif sid == "undergraduate":
            labels.append("Undergraduate")
        elif sid == "graduate":
            labels.append("Graduate")
        elif sid == "phd":
            labels.append("PhD")
        elif sid == "community_college":
            labels.append("Community college")
        elif sid == "trade_school":
            labels.append("Trade school")
    return sorted(set(labels))


def infer_field_of_study_slugs(blob: str) -> list[str]:
    low = blob.lower()
    out: set[str] = set()
    if re.search(r"\bengineering\b", low):
        out.add("engineering")
    if re.search(r"\bcomputer\s+science\b|\bsoftware\s+engineering\b", low):
        out.add("computer_and_information_sciences")
    if re.search(r"\bnursing\b|\bpre[-\s]?med\b|\bmedicine\b|\bhealth\s+professions\b", low):
        out.add("health_professions_and_clinical_sciences")
    if re.search(
        r"\bteacher\b|\bteaching\s+credential\b|\beducation\s+majors?\b|\beducation\s+degree\b|\bschool\s+of\s+education\b",
        low,
    ):
        out.add("education")
    if re.search(r"\bbusiness\b|\bmarketing\b|\bmba\b", low):
        out.add("business_management_and_marketing")
    if re.search(r"\bpsychology\b", low):
        out.add("psychology")
    if re.search(r"\bbiology\b|\bbiomedical\b", low):
        out.add("biological_and_biomedical_sciences")
    # Long tokens from CIP-style labels (subset; mirrors TS heuristic).
    _TOPIC_TOKENS: list[tuple[str, str]] = [
        ("agriculture", "agriculture_and_related_sciences"),
        ("architecture", "architecture_and_related_services"),
        ("journalism", "communication_and_journalism"),
        ("mathematics", "mathematics_and_statistics"),
        ("chemistry", "physical_sciences"),
        ("physics", "physical_sciences"),
        ("english", "english_language_and_literature"),
        ("history", "history"),
        ("economics", "social_sciences"),
        ("sociology", "social_sciences"),
        ("anthropology", "social_sciences"),
        ("political", "social_sciences"),
        ("philosophy", "philosophy_and_religious_studies"),
        ("theology", "theology_and_religious_vocations"),
        ("music", "visual_and_performing_arts"),
        ("theatre", "visual_and_performing_arts"),
        ("dance", "visual_and_performing_arts"),
        ("art", "visual_and_performing_arts"),
    ]
    for needle, slug in _TOPIC_TOKENS:
        if re.search(rf"\b{re.escape(needle)}\b", low) and len(needle) >= 4:
            out.add(slug)
    return sorted(out)[:5]


def parse_gpa_min_from_blob(blob: str) -> float | None:
    m = re.search(r"\bgpa\b[^0-9]{0,14}([23](?:\.\d{1,2})?)\b", blob, re.I)
    if not m:
        return None
    try:
        return float(m.group(1))
    except (TypeError, ValueError):
        return None


def gpa_min_to_bucket(min_val: float | None) -> str | None:
    if min_val is None or min_val != min_val:  # NaN
        return None
    if min_val >= 3.5:
        return "gpa_3_5_plus"
    if min_val >= 3.0:
        return "gpa_3_0_plus"
    if min_val >= 2.5:
        return "gpa_2_5_plus"
    if min_val >= 2.0:
        return "gpa_2_0_plus"
    return "no_gpa_requirement"


def state_codes_from_full_state_names(blob: str) -> list[str]:
    """USPS codes from full state names only (avoids 'or' → OR false positives)."""
    out: list[str] = []
    low = blob.lower()
    for name, code in _US_NAME_TO_CODE.items():
        if re.search(rf"\b{re.escape(name.lower())}\b", low):
            out.append(code)
    if re.search(r"\b(?:district\s+of\s+columbia|washington\s*,?\s*dc)\b", blob, re.I):
        out.append("DC")
    return _uniq_sorted_usps(out)


def apply_catalog_match_fields(record: dict[str, Any], blob: str) -> None:
    """Fill hub filter columns when missing; merges geo from text + state_territory_text."""
    scope = (record.get("location_scope") or "").strip().lower()
    nationwide = scope in ("national",) or bool(
        re.search(r"\bnationwide\b|\bany\s+state\b|\ball\s+50\s+states\b", blob, re.I)
    )

    # Citizenship
    cur_c = _as_str_list(record.get("citizenship_statuses"))
    if not cur_c:
        inferred = infer_citizenship_statuses(blob)
        if inferred:
            record["citizenship_statuses"] = inferred

    # Education
    cur_ce = _as_str_list(record.get("catalog_education_levels"))
    cur_sl = _as_str_list(record.get("study_levels"))
    if not cur_ce and not cur_sl:
        edu_ids = infer_catalog_education_level_ids(blob)
        if edu_ids:
            record["catalog_education_levels"] = edu_ids
            record["study_levels"] = study_levels_labels_from_ids(edu_ids)

    # Field of study (JSON string array)
    cur_fos = _as_str_list(record.get("field_of_study"))
    if not cur_fos:
        fos = infer_field_of_study_slugs(blob)
        if fos:
            record["field_of_study"] = fos

    # GPA
    gb_raw = record.get("gpa_bucket")
    gb = str(gb_raw).strip() if gb_raw is not None else ""
    if not gb:
        gmin: float | None = None
        raw_min = record.get("gpa_requirement_min")
        if isinstance(raw_min, (int, float)) and raw_min == raw_min:
            gmin = float(raw_min)
        if gmin is None:
            gmin = parse_gpa_min_from_blob(blob)
        if gmin is not None:
            record["gpa_requirement_min"] = round(gmin, 4)
            record["gpa_bucket"] = gpa_min_to_bucket(gmin)
        elif re.search(r"\bno\s+gpa\b|\bgpa\s+not\s+required\b|\bwithout\s+a\s+gpa\b", blob, re.I):
            record["gpa_bucket"] = "no_gpa_requirement"

    # Geo: merge state_codes from full names in blob (unless nationwide catalog).
    base_states = _as_str_list(record.get("state_codes"))
    from_names: list[str] = [] if nationwide else state_codes_from_full_state_names(blob)
    merged = _uniq_sorted_usps([*base_states, *from_names])
    if merged:
        record["state_codes"] = merged

    loc = _as_str_list(record.get("location_tags"))
    if nationwide:
        if loc:
            record["location_tags"] = sorted(set(loc))
    elif merged or loc:
        record["location_tags"] = _uniq_sorted_usps([*loc, *merged])
