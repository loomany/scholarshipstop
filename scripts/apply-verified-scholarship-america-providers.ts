import { createClient } from '@supabase/supabase-js';

import { providerIdentitySlugify } from '../lib/providers/providerIdentityCandidate';

const VERIFIED: Record<string, string> = {
  'abbvie-immunology-scholarship-abbvieimmunologyscholarship':
    'AbbVie',
  'alec-bright-future-scholarship-program-alec':
    'Abbott Laboratories Employees Credit Union',
  'bae-systems-first-scholarship-program-baesystemsfirst':
    'BAE Systems',
  'brave-of-heart-nursing-scholarship-bohnursing':
    'Brave of Heart Fund',
  'brave-of-heart-scholarship-braveofheart':
    'Brave of Heart Fund',
  'colin-moon-feltis-memorial-esports-scholarship-moon-memorial':
    'Kristy and Troy Feltis',
  'dunkin-baltimore-metro-dc-regional-scholarship-dunkinbaltimoredc':
    'Dunkin',
  'dunkin-philadelphia-regional-scholarship-program-dunkinphilly':
    'Dunkin',
  'cla-foundation-opportunity-scholarship-program-claopportunityscholarship':
    'CLA Foundation',
  'edison-international-lineworker-scholarship-edisoninternationallineworkersch':
    'Edison International',
  'entergy-power-your-future-scholarship-poweryourfuture':
    'Entergy Corporation',
  'ernest-c-styberg-jr-memorial-scholarship-program-stybergmemorial':
    'E.C. Styberg Foundation, Inc.',
  'firehouse-subs-public-safety-foundation-scholarship-program-firehousesubsfoundation':
    'Firehouse Subs Public Safety Foundation',
  'the-florida-power-light-company-robotics-scholarship-program-nextera':
    'NextEra Energy Foundation',
  'ibtta-foundation-scholarship-ibtta':
    'International Bridge, Tunnel and Turnpike Foundation',
  'joe-lieberman-connecticut-scholarship-program-lieberman':
    'Joe Lieberman Connecticut Scholarship Fund',
  'margaret-w-irvin-lesher-foundation-scholarship-lesherscholarship':
    'Margaret W. and Irvin Lesher Foundation',
  'nsa-scholarship-program-nsacares':
    'National Supermarket Association Scholarship Foundation',
  'new-york-life-golden-futures-scholarship-nyl-golden-futures':
    'New York Life',
  'nick-and-karen-schmit-scholarship-program-schmit':
    'Nick and Karen Schmit',
  'pega-scholars-program-pegascholars':
    'Pegasystems',
  'prairie-heights-future-leaders-scholarship-program-prairieheights':
    'Muriel C. Majneri Trust',
  'sacramento-county-midwifery-scholarship-program-midwifery':
    'Sacramento County',
  'snyder-langston-future-builders-scholarship-snyderlangston':
    'Snyder Langston',
  'st-elizabeth-health-foundation-scholarship-program-saintelizabeth':
    'St. Elizabeth Health Foundation',
  'stanley-k-powers-educational-trust-scholarship-stanleypowers':
    'Stanley K. Powers Educational Trust',
  'tacp-foundation-scholarship-program-tacpa':
    'TACP Foundation',
  'tencent-america-scholarship-tencentamerica':
    'Tencent',
  'the-edwin-e-and-janet-l-bryant-foundation-inc-scholarship-program-bryantfoundation':
    'Edwin E. and Janet L. Bryant Foundation, Inc.',
  'the-families-of-freedom-scholarship-fund-d65792a9c36d':
    'Families of Freedom Scholarship Fund',
  'the-greatrex-scholarship-program-greatrex':
    'The Boston Foundation',
  'the-guild-giving-national-scholarship-guildgiving':
    'Guild Giving Foundation',
  'the-howard-hughes-community-scholarship-program-howardhughes':
    'Howard Hughes',
  'the-mcroberts-memorial-law-scholarship-fund-mcrobertsmemorial':
    'Hattie Feger McRoberts Trust',
  'the-paula-kovarick-segalman-scholarship-program-segalman':
    'EveryLife Foundation for Rare Diseases',
  'the-takeoff-scholarship-program-takeoffscholars':
    'Fred Perry and Gifford Shaw',
  'the-wendel-foundation-scholarship-program-wendelfoundation':
    'Wendel Foundation',
  'the-william-gawor-perpetual-scholarship-program-gawor':
    'William Gawor Estate',
  'william-j-mcmannis-and-a-haskell-mcmannis-educational-trust-mcmannis':
    'William J. McMannis and A. Haskell McMannis Educational Trust',
  'vertex-foundation-scholarship-for-scd-tdt-scholars-vertexfoundationscdtdt':
    'Vertex Foundation',
  'wells-fargo-veterans-scholarship-program-wellsfargoveterans':
    'Wells Fargo',
  'west-texas-strong-memorial-scholarship-program-westtexasstrong':
    'The Kent Companies'
};

function env(name: string): string {
  return process.env[name]?.trim() ?? '';
}

async function main() {
  const url = env('NEXT_PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  const supabase = createClient(url, key);
  const providerRows = new Map<string, string>();
  let updatedScholarships = 0;

  for (const [scholarshipSlug, providerName] of Object.entries(VERIFIED)) {
    const providerSlug = providerIdentitySlugify(providerName);
    if (!providerSlug) continue;

    const { error } = await supabase
      .from('scholarships')
      .update({
        provider_name: providerName,
        provider_slug: providerSlug
      })
      .eq('slug', scholarshipSlug)
      .is('provider_name', null)
      .is('provider_slug', null);

    if (error) throw error;
    updatedScholarships += 1;
    providerRows.set(providerSlug, providerName);
  }

  const rows = [...providerRows.entries()].map(([slug, display_name]) => ({
    slug,
    display_name
  }));

  const { data, error } = await supabase
    .from('providers')
    .upsert(rows, { onConflict: 'slug', ignoreDuplicates: true })
    .select('slug, display_name, is_enriched');

  if (error) throw error;

  console.log(
    JSON.stringify(
      {
        updatedScholarships,
        providerRows: rows.length,
        insertedProviders: data?.length ?? 0,
        slugs: rows.map((row) => row.slug).sort()
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
