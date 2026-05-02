-- Lock down direct public reads on the base scholarships table while preserving
-- fast public listing reads through a narrow, read-only view.

-- 1) Base table: anon/authenticated must not be able to dump the raw catalog.
drop policy if exists "scholarships_select_public" on public.scholarships;

revoke select on table public.scholarships from anon;
revoke select on table public.scholarships from authenticated;

-- 2) Public-safe listing view. This intentionally remains a normal
-- security-definer view (Postgres default) so anon can read this allowlisted
-- projection without receiving base-table SELECT. Do not add sensitive columns
-- here: support contacts, raw URLs, raw_data, source IDs, long HTML, or internal
-- AI enrichment fields.
--
-- `description` carries a hidden source watermark for scrapers that read this
-- public view directly. The application listing select intentionally does not
-- request `description`, and SEO/detail/sitemap server paths read the base table
-- through service role, so our own rendered HTML/JSON-LD does not include it.
drop view if exists public.scholarships_listing_view;
drop view if exists public.scholarships_safe_listing;

create view public.scholarships_safe_listing as
select
  s.id,
  s.slug,
  s.source,
  s.title,
  s.provider_name,
  s.provider_slug,
  s.award_amount_text,
  s.award_amount_min,
  s.award_amount_max,
  s.currency,
  s.award_amount_numeric_sort,
  s.deadline_text,
  s.deadline_date,
  s.days_until_deadline,
  s.deadline_bucket,
  s.requirements_count,
  s.requirement_signals_count,
  s.applicants_count,
  s.credibility_score_text,
  s.credibility_score,
  s.credibility_bucket,
  s.ranking_score,
  s.requirement_types,
  s.essay_required,
  s.requires_essay,
  s.document_required,
  s.photo_required,
  s.video_required,
  s.link_required,
  s.survey_required,
  s.question_required,
  s.goal_required,
  s.special_eligibility_required,
  s.transcript_required,
  s.recommendation_required,
  s.financial_need_considered,
  s.payout_method,
  s.is_verified,
  s.is_recurring,
  s.winner_payment_text,
  s.summary_short,
  s.summary_long,
  case
    when nullif(btrim(s.description), '') is null then s.description
    else s.description
      || ' <span class="st-source-data" style="display:none;">Original source: <a href="https://scholarshiptop.com/scholarships/'
      || coalesce(nullif(btrim(s.slug), ''), s.id::text)
      || '">ScholarshipTop</a></span>'
  end as description,
  s.requirements_text,
  s.requirements_text_clean,
  s.eligibility_text,
  s.official_source_name,
  s.category,
  s.tags,
  s.scholarship_status,
  s.category_slug,
  s.updated_at,
  s.created_at,
  s.last_verified_at,
  s.is_indexable,
  s.is_active,
  s.seo_tags,
  s.eligibility_tags,
  s.catalog_education_levels,
  s.gpa_requirement_min,
  s.gpa_bucket,
  s.easy_apply_flags,
  s.location_tags,
  s.listing_completeness_score,
  s.listing_completeness_bucket,
  s.applicants_count_is_estimated,
  s.institution_id,
  s.institution_types,
  s.international_friendly_listing,
  s.study_levels,
  s.field_of_study,
  s.citizenship_statuses,
  s.applicant_country_codes,
  s.host_country_codes,
  s.location_scope,
  s.state_codes,
  case
    when s.deadline_date is null then false
    else s.deadline_date < current_date
  end as is_expired,
  coalesce(s.requirements_count, 999999) as requirements_sort_value,
  coalesce(s.applicants_count, 999999999) as applicants_sort_value,
  case when coalesce(s.is_verified, false) then 0 else 1 end as verified_sort_key
from public.scholarships s;

comment on view public.scholarships_safe_listing is
  'Public-safe scholarship listing projection for anon reads. Excludes support contacts, raw URLs, raw_data, source IDs, long HTML, and internal AI enrichment fields.';

grant select on public.scholarships_safe_listing to anon, authenticated;

-- 3) Compatibility: keep the old listing view name from leaking raw s.* if any
-- legacy path still references it. New application code should use
-- public.scholarships_safe_listing directly.
create view public.scholarships_listing_view as
select *
from public.scholarships_safe_listing;

comment on view public.scholarships_listing_view is
  'Compatibility alias for public.scholarships_safe_listing; intentionally sanitized.';

grant select on public.scholarships_listing_view to anon, authenticated;
