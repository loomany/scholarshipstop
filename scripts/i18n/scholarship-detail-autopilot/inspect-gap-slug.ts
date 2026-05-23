import { createClient } from '@supabase/supabase-js';
import { listPublishedScholarshipDetailTranslations } from '@/lib/i18n/scholarshipPilot/listPublishedScholarshipDetailTranslations';
import { loadEnvLocal } from './env';

async function main() {
  loadEnvLocal();
  const slug = process.argv[2] ?? 'national-coal-transportation-association-scholarship-ugrffrt7mhwx';
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: sch } = await db
    .from('scholarships')
    .select('id, slug, is_indexable, title')
    .eq('slug', slug)
    .maybeSingle();
  const { data: tr } = await db
    .from('content_translations')
    .select('translated_slug, translated_title, translated_body, translated_summary, quality_score, machine_model')
    .eq('source_type', 'scholarship_detail')
    .eq('source_id', sch?.id ?? '')
    .eq('locale', 'es')
    .maybeSingle();
  const listed = await listPublishedScholarshipDetailTranslations();
  const inList = listed.some((r) => r.scholarshipSlug === slug && r.locale === 'es');
  console.log({ sch, tr, inList, listedCount: listed.filter((r) => r.scholarshipSlug === slug).length });
}

main();
