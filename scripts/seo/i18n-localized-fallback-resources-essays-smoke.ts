/**
 * Smoke: localized resource/essay English fallback (noindex, English canonical).
 *
 * Usage (dev server on PORT, default 3000):
 *   npx tsx scripts/seo/i18n-localized-fallback-resources-essays-smoke.ts
 *   npx tsx scripts/seo/i18n-localized-fallback-resources-essays-smoke.ts --base http://localhost:3020
 */

const args = process.argv.slice(2);
const baseFlag = args.find((a) => a.startsWith('--base='));
const BASE = (
  baseFlag?.split('=')[1] ??
  process.env.SMOKE_BASE_URL ??
  'http://localhost:3000'
).replace(/\/+$/, '');

type Check = {
  name: string;
  path: string;
  expectStatus: number;
  expectRobots?: RegExp;
  expectCanonical?: RegExp;
  expectBody?: RegExp;
  forbidBody?: RegExp;
};

const RESOURCE_SLUG = 'scholarship-eligibility-requirements-usa';

const checks: Check[] = [
  {
    name: 'EN resource',
    path: `/resources/${RESOURCE_SLUG}`,
    expectStatus: 200
  },
  {
    name: 'ES resource fallback',
    path: `/es/resources/${RESOURCE_SLUG}`,
    expectStatus: 200,
    expectRobots: /noindex/i,
    expectCanonical: new RegExp(
      `https://scholarshiptop\\.com/resources/${RESOURCE_SLUG}`
    ),
    expectBody: /disponible actualmente en inglés/i
  },
  {
    name: 'FR resource fallback',
    path: `/fr/resources/${RESOURCE_SLUG}`,
    expectStatus: 200,
    expectRobots: /noindex/i,
    expectCanonical: new RegExp(
      `https://scholarshiptop\\.com/resources/${RESOURCE_SLUG}`
    ),
    expectBody: /actuellement disponible en anglais/i
  },
  {
    name: 'ES fake resource 404',
    path: '/es/resources/fake-does-not-exist-xyz',
    expectStatus: 404,
    expectBody: /Página no encontrada/i,
    forbidBody: /Page not found/i
  },
  {
    name: 'FR fake resource 404',
    path: '/fr/resources/fake-does-not-exist-xyz',
    expectStatus: 404,
    expectBody: /Page introuvable/i,
    forbidBody: /Page not found/i
  },
  {
    name: '/en 404',
    path: '/en/resources/foo',
    expectStatus: 404
  },
  {
    name: 'ES fake essay 404',
    path: '/es/essays/fake-does-not-exist-xyz',
    expectStatus: 404,
    expectBody: /Página no encontrada/i,
    forbidBody: /Page not found/i
  },
  {
    name: 'FR fake essay 404',
    path: '/fr/essays/fake-does-not-exist-xyz',
    expectStatus: 404,
    expectBody: /Page introuvable/i,
    forbidBody: /Page not found/i
  }
];

async function fetchHtml(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`, {
    redirect: 'follow',
    headers: { Accept: 'text/html' }
  });
  return { status: res.status, html: await res.text() };
}

function robotsFromHtml(html: string): string {
  const m = html.match(
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i
  );
  return m?.[1] ?? '';
}

function canonicalFromHtml(html: string): string {
  const m = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );
  return m?.[1] ?? '';
}

async function main() {
  let failed = 0;
  for (const check of checks) {
    const { status, html } = await fetchHtml(check.path);
    const issues: string[] = [];
    if (status !== check.expectStatus) {
      issues.push(`status ${status} !== ${check.expectStatus}`);
    }
    if (check.expectRobots && !check.expectRobots.test(robotsFromHtml(html))) {
      issues.push(`robots ${robotsFromHtml(html)}`);
    }
    if (check.expectCanonical && !check.expectCanonical.test(canonicalFromHtml(html))) {
      issues.push(`canonical ${canonicalFromHtml(html)}`);
    }
    if (check.expectBody && !check.expectBody.test(html)) {
      issues.push('missing expected body fragment');
    }
    if (check.forbidBody && check.forbidBody.test(html)) {
      issues.push('forbidden body fragment present');
    }
    if (issues.length) {
      failed++;
      console.error(`FAIL ${check.name} (${check.path})`);
      for (const i of issues) console.error(`  - ${i}`);
    } else {
      console.log(`OK   ${check.name}`);
    }
  }
  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} check(s) failed (base=${BASE})`);
  } else {
    console.log(`\nAll checks passed (base=${BASE})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
