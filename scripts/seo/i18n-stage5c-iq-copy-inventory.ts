/**
 * Stage 5C audit helper — generates copy inventory CSV (read-only, no DB).
 * Run: npx tsx scripts/seo/i18n-stage5c-iq-copy-inventory.ts
 */
import { writeFileSync } from 'fs';
import { cognitiveAssessmentQuestions } from '../../lib/cognitiveAssessmentQuestions';
import { domainLabels } from '../../components/iq/assessmentScoring';

const OUT = 'reports/seo/i18n-stage5c-iq-copy-inventory-2026-05-21.csv';

function esc(s: string) {
  return `"${s.replace(/"/g, '""').replace(/\n/g, ' ')}"`;
}

const rows: string[][] = [];
const header = [
  'id',
  'surface',
  'file_path',
  'string_key',
  'en_text',
  'category',
  'translation_method',
  'in_scope_v1',
  'notes'
];
rows.push(header);

const ui: string[][] = [
  [
    'iq-meta-home',
    'SEO metadata',
    'app/iq/page.tsx',
    'metadata.title',
    'Online IQ Test | IQ-Style Score and Cognitive Profile',
    'seo_meta',
    'dictionary',
    'yes',
    'canonical https://iq.scholarshiptop.com/'
  ],
  [
    'iq-landing-hero',
    'Landing marketing',
    'app/iq/ScholarshipIqTestClient.tsx',
    'page body',
    '(40+ marketing strings: hero, features, FAQ snippets, CTAs)',
    'static_ui',
    'dictionary',
    'yes',
    'General funnel landing only'
  ],
  [
    'iq-assess-intro',
    'Assessment intro',
    'components/iq/AssessmentEngine.tsx',
    'AssessmentIntro',
    'Measure your IQ score and cognitive pattern.',
    'static_ui',
    'dictionary',
    'yes',
    'Summary cards + Start IQ Test button'
  ],
  [
    'iq-progress',
    'Progress UI',
    'components/iq/AssessmentEngine.tsx',
    'ProgressHeader',
    'Step {n} of 30; Time left; Start again',
    'static_ui',
    'dictionary',
    'yes',
    'Analyzer messages array (5 strings)'
  ],
  [
    'iq-paywall',
    'Paywall chrome',
    'components/iq/StandardIqPaywall.tsx',
    'headline',
    'Your cognitive report has been generated.',
    'auth_paywall',
    'dictionary_ui_only',
    'yes',
    'Lemon redirect unchanged; $9.99 copy localizable'
  ],
  [
    'iq-report',
    'Unlocked report',
    'components/iq/UnlockedIqReport.tsx',
    'template',
    'IQ Report Unlocked; domain chart; archetype from result JSON',
    'result_template',
    'dictionary',
    'yes',
    'Archetype strings stored in JSON at scoring time'
  ],
  [
    'iq-report-token',
    'Token report page',
    'app/iq/report/[token]/page.tsx',
    'metadata + not found',
    'Your IQ Report; Report not found',
    'seo_meta',
    'dictionary',
    'yes',
    'robots index:false already'
  ],
  [
    'iq-checkout-server',
    'Checkout server errors',
    'app/actions/iqReportCheckout.ts',
    'errors',
    'Enter a valid email address.; Could not prepare your report checkout.',
    'auth_paywall',
    'dictionary_errors_only',
    'yes',
    'Lemon product description HTML English today'
  ],
  [
    'iq-email-step',
    'Email capture',
    'app/iq/GeneralIqFunnelClient.tsx',
    'email validation',
    'Enter a valid email address.',
    'static_ui',
    'dictionary',
    'yes',
    'Reuses CountryEmailSignupStep (main onboarding strings)'
  ],
  [
    'iq-footer',
    'Product footer',
    'components/iq/IqProductFooter.tsx',
    'iqFooterLinks',
    'Home; About; Help; Privacy Policy; Terms; Refund; FAQ',
    'static_ui',
    'dictionary',
    'yes',
    'href rewrite on subdomain: /iq -> /'
  ],
  [
    'iq-navbar',
    'Site chrome',
    'components/ui/Navbar/Navlinks.tsx',
    'isIqProductPage',
    'Minimal IQ logo nav (English labels if any)',
    'static_ui',
    'dictionary',
    'yes',
    'Root layout still mounts main Navbar + SiteFooter'
  ],
  [
    'iq-legal-bulk',
    'Legal pages',
    'app/iq/{about,help,faq,privacy-policy,terms,refund-policy}/page.tsx',
    'sections',
    '(long English legal copy per page)',
    'static_ui',
    'dictionary',
    'phase2',
    '6 pages; can ship after core funnel'
  ],
  [
    'iq-contextual',
    'Contextual assessment funnel',
    'app/iq/assessment/ContextualAssessmentFunnelClient.tsx',
    'multi-phase UI',
    '(1700+ lines: intro, email, qualification, strategy paywall)',
    'static_ui',
    'dictionary',
    'phase2',
    'Uses generateStrategy() English templates'
  ],
  [
    'iq-slug-landings',
    'Intent SEO landings',
    'app/iq/[slug]/page.tsx',
    '5 slugs',
    'scholarship-match; provider-research; college-fit; essay-prep; deadline-strategy',
    'static_ui',
    'dictionary',
    'phase2',
    'Large per-slug marketing + metadata'
  ],
  [
    'iq-strategy-engine',
    'Strategy recommendation',
    'lib/strategyRecommendationEngine.ts',
    'generateStrategy',
    'Template sentences with profile labels (English)',
    'dynamic_generated',
    'dictionary',
    'phase2',
    'Rule-based not OpenAI; profile labels from EN constants'
  ],
  [
    'iq-archetype-scoring',
    'Scoring labels',
    'components/iq/assessmentScoring.ts',
    'lockedArchetype',
    'Spatial Architect; Quantitative Analyst; Strategic Reasoner',
    'result_template',
    'dictionary',
    'yes',
    'Persisted in assessment_result JSON and paywall'
  ]
];

for (const r of ui) rows.push(r);

for (const [domain, label] of Object.entries(domainLabels)) {
  rows.push([
    `iq-domain-${domain}`,
    'Domain label',
    'components/iq/assessmentScoring.ts',
    `domainLabels.${domain}`,
    label,
    'result_template',
    'dictionary',
    'yes',
    'Question chips + report chart'
  ]);
}

for (const q of cognitiveAssessmentQuestions) {
  const opts = Object.entries(q.options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ');
  rows.push([
    `iq-q-${q.id}`,
    'Question bank',
    'lib/cognitiveAssessmentQuestions.ts',
    `${q.id}.prompt`,
    q.prompt,
    'question_bank',
    'localized_question_bank',
    'yes',
    `options: ${opts}`
  ]);
  if (q.visual) {
    rows.push([
      `iq-q-${q.id}-vis`,
      'Question visual',
      'lib/cognitiveAssessmentQuestions.ts',
      `${q.id}.visual`,
      `${q.visual.title} / ${q.visual.caption}`,
      'question_bank',
      'dictionary',
      'yes',
      'Visual kind SVG; localize title/caption only'
    ]);
  }
  rows.push([
    `iq-q-${q.id}-exp`,
    'Question explanation',
    'lib/cognitiveAssessmentQuestions.ts',
    `${q.id}.explanation`,
    q.explanation,
    'question_bank',
    'dictionary',
    'yes',
    'Post-answer copy if surfaced'
  ]);
}

const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
writeFileSync(OUT, csv, 'utf8');
console.log(`Wrote ${OUT} (${rows.length - 1} data rows)`);
