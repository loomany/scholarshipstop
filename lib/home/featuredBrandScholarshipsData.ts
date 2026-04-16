export type FeaturedBrandScholarship = {
  brandName: string;
  /** Domain for Unavatar fallback: https://unavatar.io/[domain] */
  brandDomain: string;
  title: string;
  description: string;
  amount: string;
  href: string;
};

/** True when `amount` looks like a concrete USD figure (e.g. `$5,000`), not "Varies". */
export function featuredScholarshipHasSpecificUsdAmount(amount: string): boolean {
  return /\$\s*[\d]/.test(amount.trim());
}

function parseUsdAmountRank(amount: string): number {
  const m = amount.match(/\$\s*([\d,]+)/);
  if (!m) return 0;
  return parseInt(m[1].replace(/,/g, ''), 10) || 0;
}

/**
 * Reorder so adjacent cards rarely share the same brand (greedy round-robin by domain).
 * Deterministic: stable within each brand by `href`.
 */
export function interleaveFeaturedBrandsNoAdjacent(
  items: FeaturedBrandScholarship[]
): FeaturedBrandScholarship[] {
  if (items.length <= 1) return [...items];

  const byDomain = new Map<string, FeaturedBrandScholarship[]>();
  for (const row of items) {
    const d = row.brandDomain;
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d)!.push(row);
  }
  for (const [, list] of byDomain) {
    list.sort((a, b) => a.href.localeCompare(b.href));
  }

  const domainKeys = [...byDomain.keys()].sort((a, b) => a.localeCompare(b));
  const total = items.length;
  const out: FeaturedBrandScholarship[] = [];
  let lastDomain: string | null = null;

  while (out.length < total) {
    const candidates = domainKeys.filter((k) => byDomain.get(k)!.length > 0);
    const pickable = candidates.filter((k) => k !== lastDomain);
    const pool = pickable.length > 0 ? pickable : candidates;
    let best = pool[0]!;
    let bestSize = byDomain.get(best)!.length;
    for (let i = 1; i < pool.length; i++) {
      const k = pool[i]!;
      const sz = byDomain.get(k)!.length;
      if (sz > bestSize) {
        best = k;
        bestSize = sz;
      }
    }
    const q = byDomain.get(best)!;
    out.push(q.shift()!);
    lastDomain = best;
  }

  return out;
}

/**
 * Curated brand-sponsored scholarships (catalog slugs).
 * Amounts are indicative where the catalog does not expose a single figure.
 */
export const FEATURED_BRAND_SCHOLARSHIPS_ALL: FeaturedBrandScholarship[] = [
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo Veterans Scholarship Program',
    description:
      'Support for veterans and eligible family members pursuing undergraduate or graduate study.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-veterans-scholarship-program-wellsfargoveterans'
  },
  {
    brandName: 'AMD',
    brandDomain: 'amd.com',
    title: 'AMD Gary Heerssen Memorial Scholarship',
    description:
      'Memorial award for students in technical fields at partner institutions.',
    amount: '$5,000',
    href: '/scholarships/amd-gary-heerssen-memorial-scholarship-lfljjxvijicw'
  },
  {
    brandName: "McDonald's",
    brandDomain: 'mcdonalds.com',
    title: "McDonald's of Central Texas ACC Scholarship",
    description:
      'Local operator-sponsored support for Austin Community College students.',
    amount: 'Varies',
    href: '/scholarships/mcdonald-s-of-central-texas-acc-scholarship-ijpy6gwuxrbh'
  },
  {
    brandName: 'Samsung',
    brandDomain: 'samsung.com',
    title: 'Samsung Austin Semiconductor Scholars Scholarship',
    description:
      'STEM-focused award tied to Samsung Austin Semiconductor community programs.',
    amount: 'Varies',
    href: '/scholarships/samsung-austin-semiconductor-scholars-scholarship-nvtd8nhr3lkb'
  },
  {
    brandName: 'Pfizer',
    brandDomain: 'pfizer.com',
    title: 'Pfizer Scholarship',
    description:
      'Community foundation scholarship for qualifying students in the region.',
    amount: 'Varies',
    href: '/scholarships/pfizer-scholarship-v1tiacojqbpo'
  },
  {
    brandName: 'AT&T',
    brandDomain: 'att.com',
    title: 'AT&T Scholarship for Academic Excellence and Community Service',
    description:
      'Recognizes strong academics and service at Eastern Florida State College.',
    amount: 'Varies',
    href: '/scholarships/at-t-scholarship-for-academic-excellence-and-community-service-xvwlmzgnnzdb'
  },
  {
    brandName: 'Bank of America',
    brandDomain: 'bankofamerica.com',
    title: 'Bank of America Scholarship',
    description:
      'Institutional partner award for students meeting program criteria.',
    amount: 'Varies',
    href: '/scholarships/bank-of-america-scholarship-9v51viel4dch'
  },
  {
    brandName: 'Boeing',
    brandDomain: 'boeing.com',
    title: 'Boeing Aerospace Scholarship',
    description:
      'STEM and aerospace pathway support for eligible applicants.',
    amount: 'Varies',
    href: '/scholarships/boeing-aerospace-scholarship-owtttiwgtgwo'
  },
  {
    brandName: 'Boeing',
    brandDomain: 'boeing.com',
    title: 'Boeing Rising Technical Star Scholarship',
    description:
      'For students pursuing technical fields with strong academic records.',
    amount: 'Varies',
    href: '/scholarships/boeing-rising-technical-star-scholarship-r2fwni2ylrs1'
  },
  {
    brandName: 'Boeing',
    brandDomain: 'boeing.com',
    title: 'Boeing STEM Scholarship',
    description:
      'Focused on science, technology, engineering, and mathematics majors.',
    amount: 'Varies',
    href: '/scholarships/boeing-stem-scholarship-dd1yikjmjzhn'
  },
  {
    brandName: 'Northrop Grumman',
    brandDomain: 'northropgrumman.com',
    title: 'Northrop Grumman Scholarship',
    description:
      'Defense and aerospace STEM scholarship through institutional partnership.',
    amount: 'Varies',
    href: '/scholarships/northrop-grumman-scholarship-a3gzjyyx2hk5'
  },
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo Scholarship',
    description:
      'General institutional award for students meeting eligibility requirements.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-scholarship-iiczvmlltiqb'
  },
  {
    brandName: 'Nestlé',
    brandDomain: 'nestle.com',
    title: 'Nestlé Waters Florida Scholarship',
    description:
      'Regional program supporting students with clear eligibility criteria.',
    amount: 'Varies',
    href: '/scholarships/nestle-waters-florida-every-drop-counts-nestle-waters-north-america-inc--pb1mb3m0kpt1'
  },
  {
    brandName: 'Google',
    brandDomain: 'google.com',
    title: 'Generation Google Scholarship',
    description:
      'Computer science and related fields; strong academics and leadership.',
    amount: '$10,000',
    href: '/scholarships/generation-google-scholarship-nb3augz7pi07'
  },
  {
    brandName: 'AT&T',
    brandDomain: 'att.com',
    title: 'Laurel Hester Memorial Scholarship',
    description:
      'LEAGUE at AT&T memorial program for eligible student applicants.',
    amount: 'Varies',
    href: '/scholarships/laurel-hester-memorial-scholarship-a5k8dgqcrkco'
  },
  {
    brandName: 'AT&T',
    brandDomain: 'att.com',
    title: 'Matthew Shepard Memorial Scholarship',
    description:
      'LEAGUE at AT&T scholarship honoring community and inclusion values.',
    amount: 'Varies',
    href: '/scholarships/matthew-shepard-memorial-scholarship-uzzxw67deqp9'
  },
  {
    brandName: 'Schneider Electric',
    brandDomain: 'se.com',
    title: 'Schneider Electric / Square D Scholarship',
    description:
      'Industry partnership award for students in relevant technical paths.',
    amount: 'Varies',
    href: '/scholarships/schneider-electric-square-d-scholarship-lkso4zvzag3q'
  },
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo Endowment Fund Scholarship',
    description:
      'Endowment-backed support for students at partner institutions.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-endowment-fund-scholarship-qlx9fpj6snvy'
  },
  {
    brandName: 'UPS',
    brandDomain: 'ups.com',
    title: 'UPS Sponsored Scholarship (Mu Kappa Tau)',
    description:
      'Organization-sponsored award for members meeting program rules.',
    amount: 'Varies',
    href: '/scholarships/ups-sponsored-scholarship-of-mu-kappa-tau-ih4bewrqu1cu'
  },
  {
    brandName: 'Ford',
    brandDomain: 'ford.com',
    title: 'Allegra Ford Thomas Scholarship',
    description:
      'National Center for Learning Disabilities program for students with LD.',
    amount: 'Varies',
    href: '/scholarships/allegra-ford-thomas-scholarship-szl5u81qs7yz'
  },
  {
    brandName: 'Ford',
    brandDomain: 'ford.com',
    title: 'Anne Ford Scholarship',
    description:
      'NCLD scholarship recognizing achievement and educational goals.',
    amount: 'Varies',
    href: '/scholarships/anne-ford-scholarship-dm1tzf22r8cb'
  },
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo American Indian Scholarship',
    description:
      'Native Forward Scholars Fund partnership for undergraduate support.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-american-indian-scholarship-r4h6yvomcvvu'
  },
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo Scholarship for Undergraduates',
    description:
      'Undergraduate award through Native Forward Scholars Fund.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-scholarship-for-undergraduates-1g89s5rwjzpl'
  },
  {
    brandName: 'UPS',
    brandDomain: 'ups.com',
    title: 'OCA–UPS Gold Mountain Scholarship',
    description:
      'Community advocacy partnership for APA students.',
    amount: 'Varies',
    href: '/scholarships/oca-ups-gold-mountain-scholarship-tkaw64sgpvh8'
  },
  {
    brandName: 'Pfizer',
    brandDomain: 'pfizer.com',
    title: 'Soozie Courter Hemophilia Scholarship',
    description:
      'Pfizer-supported program for students affected by hemophilia.',
    amount: 'Varies',
    href: '/scholarships/soozie-courter-hemophilia-scholarship-0ecft508lffc'
  },
  {
    brandName: 'Coca-Cola',
    brandDomain: 'coca-cola.com',
    title: 'Coca-Cola Leaders of Promise Scholarship',
    description:
      'Phi Theta Kappa program for two-year college students nationwide.',
    amount: 'Varies',
    href: '/scholarships/coca-cola-leaders-of-promise-scholarship-idwx4wadt0uo'
  },
  {
    brandName: 'Toyota',
    brandDomain: 'toyota.com',
    title: 'Toyota Scholarship (Southern California PGA)',
    description:
      'Golf association partnership award for eligible student golfers.',
    amount: 'Varies',
    href: '/scholarships/toyota-scholarship-of-southern-california-pga-uirplhimogmc'
  },
  {
    brandName: 'Coca-Cola',
    brandDomain: 'coca-cola.com',
    title: 'Coca-Cola Foundation First Generation HBCU Scholarship',
    description:
      'Thurgood Marshall College Fund program for first-gen HBCU students.',
    amount: 'Varies',
    href: '/scholarships/coca-cola-foundation-first-generation-hbcu-scholarship-cqm0fbnw6krt'
  },
  {
    brandName: 'FedEx',
    brandDomain: 'fedex.com',
    title: 'FedEx HBCU Scholarship',
    description:
      'TMCF partnership supporting students at HBCUs.',
    amount: 'Varies',
    href: '/scholarships/fedex-hbcu-scholarship-j08zlkns87vk'
  },
  {
    brandName: 'Ford',
    brandDomain: 'ford.com',
    title: 'Ford Blue Oval Scholarship',
    description:
      'TMCF Ford program for students at partner institutions.',
    amount: 'Varies',
    href: '/scholarships/ford-blue-oval-scholarship-lcfyvbhyncjv'
  },
  {
    brandName: 'Nike',
    brandDomain: 'nike.com',
    title: 'NIKE HBCU Scholarship',
    description:
      'Athletic brand partnership through Thurgood Marshall College Fund.',
    amount: 'Varies',
    href: '/scholarships/nike-hbcu-scholarship-qvyi3vk0ewwt'
  },
  {
    brandName: "McDonald's",
    brandDomain: 'mcdonalds.com',
    title: "TMCF | McDonald's Black & Positively Golden Scholarship",
    description:
      'National program supporting HBCU students with strong records.',
    amount: 'Varies',
    href: '/scholarships/tmcf-mcdonald-s-black-positively-golden-scholarship-fhggvnbp0etq'
  },
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo Endowed Scholarship',
    description:
      'University endowment partnership for qualifying applicants.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-endowed-scholarship-4pljb3hbnqrg'
  },
  {
    brandName: 'Wells Fargo',
    brandDomain: 'wellsfargo.com',
    title: 'Wells Fargo Veterans Scholarship (alt. listing)',
    description:
      'Additional catalog entry for the veterans program — verify deadline on the page.',
    amount: 'Varies',
    href: '/scholarships/wells-fargo-veterans-scholarship-program-fr7ofz1mxflt'
  },
  {
    brandName: 'AT&T',
    brandDomain: 'att.com',
    title: 'WOA National Scholarship',
    description:
      'Women of AT&T national scholarship for eligible members and pathways.',
    amount: 'Varies',
    href: '/scholarships/woa-national-scholarship-z9jn9d416tcg'
  },
  {
    brandName: 'AT&T',
    brandDomain: 'att.com',
    title: 'Bay Area Women of AT&T Scholarship',
    description:
      'Chapter-level award for qualifying applicants in the Bay Area.',
    amount: 'Varies',
    href: '/scholarships/bay-area-chapter-women-of-at-t-scholarship-plmslqa053yo'
  },
  {
    brandName: 'Microsoft',
    brandDomain: 'microsoft.com',
    title: 'Microsoft-related programs',
    description:
      'Browse the catalog for STEM and diversity scholarships from major tech sponsors.',
    amount: 'Varies',
    href: '/scholarships'
  }
];

/**
 * Homepage carousel: rows with a **concrete USD amount** first (largest first), then the rest
 * ordered so the **same brand is not placed back-to-back** when avoidable.
 */
export const FEATURED_BRAND_SCHOLARSHIPS_HOME: FeaturedBrandScholarship[] = (() => {
  const all = FEATURED_BRAND_SCHOLARSHIPS_ALL;
  const withUsd = all.filter((r) => featuredScholarshipHasSpecificUsdAmount(r.amount));
  const rest = all.filter((r) => !featuredScholarshipHasSpecificUsdAmount(r.amount));
  // Highest $ first → Generation Google ($10k), then AMD ($5k); same order on mobile and desktop.
  withUsd.sort((a, b) => parseUsdAmountRank(b.amount) - parseUsdAmountRank(a.amount));
  return [...withUsd, ...interleaveFeaturedBrandsNoAdjacent(rest)];
})();

