import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyAutoInternalLinks,
  getAutoInternalLinkCandidates,
  type InternalLinkDictionaryEntry
} from '../autoInternalLinks';

const MINIMAL_RULES_LONG: InternalLinkDictionaryEntry[] = [
  {
    anchorPhrases: ['merit scholarships for nursing students nationwide'],
    targetUrl: '/scholarships/hub/matches',
    priority: 10,
    maxPerArticle: 1
  }
];

function sortCand(
  rows: ReturnType<typeof getAutoInternalLinkCandidates>
): typeof rows {
  return [...rows].sort((a, b) =>
    `${a.anchorPhrase}:${a.targetUrl}:${a.matchedText}`.localeCompare(
      `${b.anchorPhrase}:${b.targetUrl}:${b.matchedText}`
    )
  );
}

test('inserts anchor for long phrase from dictionary rules', () => {
  const html =
    '<p>You should explore merit scholarships for nursing students nationwide first.</p>';

  const out = applyAutoInternalLinks(html, { rules: MINIMAL_RULES_LONG });

  assert.match(out, /<a href="\/scholarships\/hub\/matches">/);

  assert.ok(out.includes('merit scholarships for nursing students nationwide'));
});

test('does not wrap text inside existing <a>', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['merit scholarships'],

      targetUrl: '/scholarships/hub/matches',

      priority: 10,

      maxPerArticle: 1
    }
  ];

  const html =
    '<p>Outside text. For details see <a href="https://studentaid.gov/">merit scholarships program page</a> end.</p>';

  const out = applyAutoInternalLinks(html, { rules });

  assert.equal(out, html);
});

test('does not wrap inside h2/h3 headings', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['merit scholarships'],

      targetUrl: '/x',

      priority: 10,

      maxPerArticle: 1
    }
  ];

  const html =
    '<h3>merit scholarships overview</h3><p>Discuss merit scholarships here.</p>';

  const out = applyAutoInternalLinks(html, { rules });

  assert.match(out, /<h3>merit scholarships overview<\/h3>/);
  const [beforeFirstBodyP] = out.split('<p>');
  assert.ok(beforeFirstBodyP && !beforeFirstBodyP.includes('<a'));

  assert.match(
    out,
    /<p>Discuss <a href="\/x">merit scholarships<\/a> here\.<\/p>/
  );
});

test('does not modify content at or after Sources heading', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['merit scholarships'],

      targetUrl: '/scholarships/hub/matches',

      priority: 10,

      maxPerArticle: 99
    }
  ];

  const html =
    '<p>Discuss merit scholarships briefly.</p>' +
    '<h2>Sources</h2>' +
    '<p>merit scholarships citations here.</p>';

  const out = applyAutoInternalLinks(html, { rules });

  assert.match(
    out,
    /<p>Discuss <a href="\/scholarships\/hub\/matches">merit scholarships<\/a> briefly\.<\/p>/
  );

  assert.ok(out.includes('<h2>Sources</h2>'));

  assert.match(
    out,

    /<p>merit scholarships citations here\.<\/p>$/
  );
});

test('respects maxLinksPerArticle total of 3', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['alpha one token'],

      targetUrl: '/a1',

      priority: 5,

      maxPerArticle: 10
    },

    {
      anchorPhrases: ['beta two token'],

      targetUrl: '/b2',

      priority: 5,

      maxPerArticle: 10
    },

    {
      anchorPhrases: ['gamma three token'],

      targetUrl: '/c3',

      priority: 5,

      maxPerArticle: 10
    },

    {
      anchorPhrases: ['delta four token'],

      targetUrl: '/d4',

      priority: 5,

      maxPerArticle: 10
    }
  ];

  const html =
    '<p>alpha one token beta two token gamma three token delta four token end.</p>';

  const out = applyAutoInternalLinks(html, { rules, maxLinksPerArticle: 3 });

  assert.equal((out.match(/<a\b/g) ?? []).length, 3);
});

test('same targetUrl linked at most once across article', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['north token'],

      targetUrl: '/same',

      priority: 10,

      maxPerArticle: 99
    },

    {
      anchorPhrases: ['south token phrase'],

      targetUrl: '/same',

      priority: 9,

      maxPerArticle: 99
    }
  ];

  const html =
    '<p>north token and south token phrase elsewhere north token phrase.</p>';

  const out = applyAutoInternalLinks(html, {
    rules,

    maxLinksPerArticle: 5
  });

  assert.equal([...out.matchAll(/href="\/same"/g)].length, 1);
});

test('longer overlapping phrase beats shorter at same cursor', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['earn merit'],

      targetUrl: '/short',

      priority: 50,

      maxPerArticle: 99
    },

    {
      anchorPhrases: ['earn merit scholarships today'],

      targetUrl: '/long',

      priority: 1,

      maxPerArticle: 99
    }
  ];

  const html = '<p>You can earn merit scholarships today if you qualify.</p>';

  const out = applyAutoInternalLinks(html, {
    rules,

    maxLinksPerArticle: 1
  });

  assert.ok(out.includes('href="/long"'));

  assert.ok(!out.includes('href="/short"'));
});

test('dryRun leaves HTML unchanged but getAutoInternalLinkCandidates lists matches', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['needle phrase token'],

      targetUrl: '/needle',

      priority: 10,

      maxPerArticle: 1
    }
  ];

  const html = '<p>needle phrase token stands out.</p>';

  const afterDry = applyAutoInternalLinks(html, {
    rules,

    dryRun: true,

    maxLinksPerArticle: 3
  });

  assert.equal(afterDry, html);

  const cand = sortCand(
    getAutoInternalLinkCandidates(html, {
      rules,

      maxLinksPerArticle: 3
    })
  );

  assert.equal(cand.length, 1);
  assert.equal(cand[0]!.matchedText.toLowerCase(), 'needle phrase token');
});

test('enabled false keeps html and yields no candidates', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['solo token xyz'],

      targetUrl: '/solo',

      priority: 10,

      maxPerArticle: 1
    }
  ];

  const html = '<p>solo token xyz phrase.</p>';

  assert.equal(
    applyAutoInternalLinks(html, { enabled: false, rules }),

    html
  );

  assert.deepEqual(
    getAutoInternalLinkCandidates(html, {
      enabled: false,

      rules
    }),
    []
  );
});

test('preserves outer authority anchor while linking separate phrase', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['standalone merit block'],

      targetUrl: '/internal-hub',

      priority: 10,

      maxPerArticle: 1
    }
  ];

  const html =
    '<p><a href="https://nces.ed.gov/">NCES reference</a> and standalone merit block elsewhere.</p>';

  const out = applyAutoInternalLinks(html, { rules });

  assert.ok(out.includes('href="https://nces.ed.gov/"'));

  assert.ok(out.includes('<a href="/internal-hub">standalone merit block</a>'));
});

test('deterministic identical output across runs', () => {
  const rules: InternalLinkDictionaryEntry[] = [
    {
      anchorPhrases: ['deterministic anchor phrase'],

      targetUrl: '/z',

      priority: 5,

      maxPerArticle: 10
    }
  ];

  const html =
    '<p>Use deterministic anchor phrase twice deterministic anchor phrase.</p>';

  const a = applyAutoInternalLinks(html, {
    rules,

    maxLinksPerArticle: 2
  });

  const b = applyAutoInternalLinks(html, {
    rules,

    maxLinksPerArticle: 2
  });

  assert.equal(a, b);
});
