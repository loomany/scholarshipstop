import { randomUUID } from 'node:crypto';
import { chromium, type Browser, type Page } from 'playwright';

const BASE_URL = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const HEADLESS = process.env.SMOKE_HEADLESS !== '0';
const CANADA_EXPECTED_COUNT = Number.parseInt(
  process.env.SMOKE_CANADA_EXPECTED_COUNT ?? '179',
  10
);
const EMAIL_DOMAIN = process.env.SMOKE_EMAIL_DOMAIN ?? 'example.com';

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

type ApiTrace = {
  method: string;
  url: string;
  request?: unknown;
  response?: unknown;
};

const apiTrace: ApiTrace[] = [];

function smokeEmail(label: string): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `st-${label}-${stamp}-${randomUUID().slice(0, 8)}@${EMAIL_DOMAIN}`.toLowerCase();
}

function url(path: string): string {
  return `${BASE_URL}${path}`;
}

async function selectDarkSelectOption(page: Page, triggerName: RegExp | string, optionName: RegExp | string) {
  await page.getByRole('button', { name: triggerName }).click();
  await page.getByRole('option', { name: optionName }).click();
}

async function waitForVisibleBodyText(page: Page, text: RegExp | string, timeout = 20_000) {
  await page.waitForFunction(
    (matcher) => {
      const bodyText = document.body.innerText;
      if (typeof matcher === 'string') {
        return bodyText.includes(matcher);
      }
      return new RegExp(matcher.source, matcher.flags).test(bodyText);
    },
    typeof text === 'string' ? text : { source: text.source, flags: text.flags },
    { timeout }
  );
}

async function bodyText(page: Page): Promise<string> {
  return page.locator('body').innerText({ timeout: 10_000 });
}

function canadaBestReadyFromText(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ');
  const showsExpected =
    new RegExp(`of\\s+${CANADA_EXPECTED_COUNT}\\s+scholarships`, 'i').test(normalized) ||
    new RegExp(`Best recommendation\\s*\\(${CANADA_EXPECTED_COUNT}\\)`, 'i').test(normalized);
  const countryChipReady = /Countries\s*\(Canada\)/i.test(normalized);
  const hasGrantCard = /Owen Hart Foundation Award/i.test(normalized) || /\bSave\b/i.test(normalized);
  return showsExpected && countryChipReady && hasGrantCard;
}

async function waitForCanadaBestReady(page: Page, phase: string): Promise<void> {
  const expectedCountText = `${CANADA_EXPECTED_COUNT} scholarships`;
  await page.waitForFunction(
    ({ expectedCount }) => {
      const text = document.body.innerText;
      const normalized = text.replace(/\s+/g, ' ');
      const showsExpected =
        new RegExp(`of\\s+${expectedCount}\\s+scholarships`, 'i').test(normalized) ||
        new RegExp(`Best recommendation\\s*\\(${expectedCount}\\)`, 'i').test(normalized);
      const countryChipReady = /Countries\s*\(Canada\)/i.test(normalized);
      const hasGrantCard = /Owen Hart Foundation Award/i.test(normalized) || /\bSave\b/i.test(normalized);
      return showsExpected && countryChipReady && hasGrantCard;
    },
    { expectedCount: CANADA_EXPECTED_COUNT },
    { timeout: 45_000 }
  ).catch(async (error) => {
    const text = await bodyText(page);
    if (canadaBestReadyFromText(text)) return;
    const foundZero = /Found 0 scholarships/i.test(text);
    const genericCountryChip = /Countries \(Countries\)/i.test(text);
    const visibleSnippet = text.replace(/\s+/g, ' ').slice(0, 1200);
    const lastApi = apiTrace.slice(-6);
    throw new Error(
      [
        `Canada best recommendation did not become ready during ${phase}.`,
        `Expected ${expectedCountText} and Countries (Canada).`,
        foundZero ? 'Observed Found 0 scholarships.' : null,
        genericCountryChip ? 'Observed generic Countries (Countries) chip.' : null,
        `URL: ${page.url()}`,
        `Visible text: ${visibleSnippet}`,
        `Recent API trace: ${JSON.stringify(lastApi, null, 2)}`,
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      ]
        .filter(Boolean)
        .join(' ')
    );
  });
}

async function waitForCanadaBestReadyWithoutZeroFlash(
  page: Page,
  phase: string
): Promise<void> {
  const deadline = Date.now() + 45_000;
  let lastText = '';
  while (Date.now() < deadline) {
    const text = await bodyText(page).catch(() => '');
    lastText = text;
    if (/Found 0 scholarships/i.test(text)) {
      throw new Error(
        `Canada best recommendation flashed Found 0 during ${phase}. Visible text: ${text
          .replace(/\s+/g, ' ')
          .slice(0, 1200)}`
      );
    }
    if (canadaBestReadyFromText(text)) return;
    await page.waitForTimeout(100);
  }
  throw new Error(
    `Canada best recommendation did not become ready during ${phase}. Visible text: ${lastText
      .replace(/\s+/g, ' ')
      .slice(0, 1200)}`
  );
}

async function runCanadaFirstLoadRegression(page: Page): Promise<CheckResult> {
  const email = smokeEmail('canada');
  await page.goto(url('/get-scholarships'), { waitUntil: 'domcontentloaded' });
  await waitForVisibleBodyText(page, 'Which country are you applying from?');
  await selectDarkSelectOption(page, /Applicant country/i, /^Canada$/);
  await page.getByRole('button', { name: /^Continue/i }).click();
  await waitForVisibleBodyText(page, 'Where should we send your scholarship matches?');
  await page.locator('#country-email').fill(email);
  await page.getByRole('button', { name: /See scholarship matches/i }).click();
  await page.waitForURL(/\/scholarships\/hub\/best-recommendation/, { timeout: 30_000 });

  await waitForCanadaBestReadyWithoutZeroFlash(page, 'first load after quiz redirect');
  const beforeReload = await bodyText(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForCanadaBestReadyWithoutZeroFlash(page, 'manual reload');
  const afterReload = await bodyText(page);

  const beforeHasExpected = beforeReload.includes(`of ${CANADA_EXPECTED_COUNT} scholarships`);
  const afterHasExpected = afterReload.includes(`of ${CANADA_EXPECTED_COUNT} scholarships`);
  if (!beforeHasExpected || !afterHasExpected) {
    return {
      name: 'Canada quiz redirect keeps expected recommendations before and after reload',
      ok: false,
      detail: `before=${beforeHasExpected} after=${afterHasExpected}`
    };
  }

  return {
    name: 'Canada quiz redirect keeps expected recommendations before and after reload',
    ok: true,
    detail: `email=${email}`
  };
}

async function runUsMultiStepRegistrationSmoke(browser: Browser): Promise<CheckResult> {
  const context = await browser.newContext();
  const page = await context.newPage();
  attachPageDiagnostics(page);
  const email = smokeEmail('us');
  try {
    await page.goto(url('/get-scholarships'), { waitUntil: 'domcontentloaded' });
    await waitForVisibleBodyText(page, 'Which country are you applying from?');
    await selectDarkSelectOption(page, /Applicant country/i, /United States/i);
    await page.getByRole('button', { name: /^Continue/i }).click();

    await waitForVisibleBodyText(page, 'Tell us about you');
    await selectDarkSelectOption(page, /School level/i, /^High school senior$/i);
    await page.getByRole('button', { name: /^Continue/i }).click();

    await waitForVisibleBodyText(page, 'What do you want to study?');
    await selectDarkSelectOption(page, /Field of study/i, /^Engineering$/i);
    await page.getByRole('button', { name: /^Continue/i }).click();

    await waitForVisibleBodyText(page, 'What is your citizenship status?');
    await selectDarkSelectOption(page, /Citizenship status/i, /^U\.S\. Citizen$/i);
    await page.getByRole('button', { name: /^Continue/i }).click();

    await waitForVisibleBodyText(page, 'What U.S. state are you in?');
    await page.locator('#onb-state').fill('California');
    await page.getByRole('option', { name: /^California$/i }).click();
    await page.getByRole('button', { name: /^Continue/i }).click();

    await waitForVisibleBodyText(page, "What's your GPA?");
    await selectDarkSelectOption(page, /^GPA$/i, /^GPA 3\.5\+$/i);
    await page.getByRole('button', { name: /^Continue/i }).click();

    await waitForVisibleBodyText(page, 'Where should we send your scholarship matches?');
    await page.locator('#country-email').fill(email);
    await page.getByRole('button', { name: /See scholarship matches/i }).click();
    await page.waitForURL(/\/scholarships\/hub\/best-recommendation/, { timeout: 30_000 });
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.replace(/\s+/g, ' ');
        if (/Found 0 scholarships/i.test(text)) return false;
        return (
          /Showing\s+1[–-]9\s+of\s+\d+\s+scholarships/i.test(text) &&
          /Countries\s*\(United States\)/i.test(text)
        );
      },
      undefined,
      { timeout: 45_000 }
    );

    return {
      name: 'US multi-step quiz creates recommendations with profile fields',
      ok: true,
      detail: `email=${email}`
    };
  } catch (error) {
    const text = await bodyText(page).catch(() => '');
    return {
      name: 'US multi-step quiz creates recommendations with profile fields',
      ok: false,
      detail: `${error instanceof Error ? error.message : String(error)} text=${text
        .replace(/\s+/g, ' ')
        .slice(0, 800)}`
    };
  } finally {
    await context.close();
  }
}

async function assertHubPage(page: Page, path: string, expected: RegExp): Promise<CheckResult> {
  await page.goto(url(path), { waitUntil: 'domcontentloaded' });
  await waitForVisibleBodyText(page, expected, 25_000);
  const text = await bodyText(page);
  if (/Found 0 scholarships/i.test(text) && !path.includes('best-recommendation')) {
    return {
      name: `Hub page ${path}`,
      ok: false,
      detail: 'Unexpected Found 0 scholarships'
    };
  }
  return { name: `Hub page ${path}`, ok: true };
}

function attachPageDiagnostics(page: Page) {
  page.on('request', (request) => {
    const requestUrl = request.url();
    if (!requestUrl.includes('/api/scholarships')) return;
    let postData: unknown = null;
    try {
      postData = request.postDataJSON();
    } catch {
      postData = request.postData();
    }
    apiTrace.push({
      method: request.method(),
      url: requestUrl,
      request: postData
    });
  });
  page.on('response', async (response) => {
    const responseUrl = response.url();
    if (!responseUrl.includes('/api/scholarships')) return;
    const match = [...apiTrace].reverse().find(
      (entry) => entry.url === responseUrl && entry.response == null
    );
    if (!match) return;
    try {
      const json = await response.json();
      match.response = {
        status: response.status(),
        total: json?.total ?? null,
        rows: Array.isArray(json?.scholarships) ? json.scholarships.length : null,
        bestCount: json?.meta?.sidebarCounts?.bestRecommendation ?? null,
        matchesCount: json?.meta?.sidebarCounts?.matches ?? null
      };
    } catch {
      match.response = { status: response.status() };
    }
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[browser console] ${msg.text()}`);
    }
  });
}

async function runSmoke() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const results: CheckResult[] = [];

  try {
    const canadaContext = await browser.newContext();
    const canadaPage = await canadaContext.newPage();
    attachPageDiagnostics(canadaPage);
    results.push(await runCanadaFirstLoadRegression(canadaPage));
    await canadaContext.close();

    results.push(await runUsMultiStepRegistrationSmoke(browser));

    const hubContext = await browser.newContext();
    const page = await hubContext.newPage();
    attachPageDiagnostics(page);
    results.push(
      await assertHubPage(
        page,
        '/scholarships/hub/easy-apply',
        /Showing\s+1[–-]9\s+of\s+\d+\s+scholarships/i
      )
    );
    results.push(
      await assertHubPage(
        page,
        '/scholarships/hub/hot-deadlines',
        /Showing\s+1[–-]9\s+of\s+\d+\s+scholarships/i
      )
    );
    results.push(
      await assertHubPage(
        page,
        '/scholarships/hub/international-friendly',
        /Showing\s+1[–-]9\s+of\s+\d+\s+scholarships/i
      )
    );
    results.push(
      await assertHubPage(
        page,
        '/scholarships/hub/matches',
        /Showing\s+1[–-]9\s+of\s+\d+\s+scholarships/i
      )
    );
    await hubContext.close();
  } finally {
    await browser.close();
  }

  for (const result of results) {
    const status = result.ok ? 'PASS' : 'FAIL';
    console.log(`${status} ${result.name}${result.detail ? ` - ${result.detail}` : ''}`);
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

runSmoke().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
