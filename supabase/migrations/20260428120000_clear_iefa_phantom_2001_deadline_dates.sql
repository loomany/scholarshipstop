-- IEFA listings sometimes omit the year; bogus deadline_date rows (e.g. 2001-11-30 from JS/V8
-- parsing or legacy ingest) must not persist when source text does not state year 2001.
update public.scholarships
set deadline_date = null
where source = 'iefa'
  and deadline_date >= date '2001-01-01'
  and deadline_date <= date '2001-12-31'
  and (
    deadline_text is null
    or strpos(deadline_text, '2001') = 0
  );
