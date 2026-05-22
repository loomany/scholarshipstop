/**
 * Post-fix detail language switcher smoke.
 */
import { getDetailLanguageSwitcherItems } from '@/lib/i18n/detailLanguageSwitcher';
import { getStage2LanguageSwitcherItems } from '@/lib/i18n/localizedHref';

const BASE = (
  process.env.SMOKE_BASE_URL ?? 'https://scholarshiptop.com'
).replace(/\/$/, '');

async function fetchHtml(path: string) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, html: await res.text() };
}

function switcherLocales(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/data-language-switcher-locale=["']([^"']+)["']/gi)) {
    out.push(m[1]!.toLowerCase());
  }
  return [...new Set(out)];
}

async function main() {
  let failed = 0;

  const scholarshipItems = getDetailLanguageSwitcherItems(
    '/scholarships/climate-stripes-scholarship-14487'
  );
  if (scholarshipItems.length !== 3) {
    failed += 1;
    console.error('FAIL programmatic scholarship pilot cluster', scholarshipItems);
  } else {
    console.log('OK   scholarship pilot cluster en/es/fr');
  }

  const providerItems = getDetailLanguageSwitcherItems('/providers/loyola-university-chicago');
  if (providerItems.length !== 3) {
    failed += 1;
    console.error('FAIL provider cluster length', providerItems.length);
  } else {
    console.log('OK   provider pilot cluster en/es/fr');
  }

  const navItems = getStage2LanguageSwitcherItems({
    pathname: '/scholarships/climate-stripes-scholarship-14487'
  });
  if (navItems.length !== 3) {
    failed += 1;
    console.error('FAIL navbar scholarship switcher', navItems);
  } else {
    console.log('OK   navbar scholarship switcher en/es/fr');
  }

  const enScholarship = await fetchHtml('/scholarships/climate-stripes-scholarship-14487');
  if (enScholarship.status !== 200) {
    failed += 1;
    console.error('FAIL EN scholarship HTTP', enScholarship.status);
  } else {
    if (enScholarship.html.includes('href="/en"')) {
      failed += 1;
      console.error('FAIL /en href on scholarship detail');
    } else {
      console.log('OK   EN scholarship no /en href (programmatic switcher cluster verified above)');
    }
  }

  const esScholarship = await fetchHtml(
    '/es/scholarships/climate-stripes-scholarship-14487'
  );
  if (esScholarship.status !== 404) {
    failed += 1;
    console.error('FAIL ES scholarship should 404', esScholarship.status);
  } else {
    console.log('OK   ES scholarship untranslated 404');
  }

  const esProvider = await fetchHtml('/es/providers/loyola-university-chicago');
  if (esProvider.status !== 200) {
    failed += 1;
    console.error('FAIL ES provider', esProvider.status);
  } else {
    const providerNavItems = getDetailLanguageSwitcherItems(
      '/es/providers/loyola-university-chicago'
    );
    if (providerNavItems.length !== 3) {
      failed += 1;
      console.error('FAIL ES provider programmatic cluster', providerNavItems);
    } else {
      console.log('OK   ES provider programmatic cluster en/es/fr');
    }
  }

  const esResource = await fetchHtml('/es/resources/how-to-apply-for-scholarships');
  if (esResource.status !== 200 || !switcherLocales(esResource.html).includes('es')) {
    failed += 1;
    console.error('FAIL ES resource switcher');
  } else {
    console.log('OK   ES resource switcher');
  }

  if (failed > 0) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log('\nAll detail language switcher smoke checks passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
