/**
 * On-demand ISR revalidation for scholarship detail DB sitemaps after publish.
 */
import { BASE, loadEnvLocal } from './env';

const PATHS = [
  '/sitemap.xml',
  '/sitemaps/locale-es-scholarships-detail-db.xml',
  '/sitemaps/locale-fr-scholarships-detail-db.xml'
];

export async function revalidateScholarshipDetailSitemaps(): Promise<void> {
  loadEnvLocal();
  const secret = process.env.REVALIDATE_API_SECRET?.trim();

  for (const path of PATHS) {
    const res = await fetch(`${BASE}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(secret ? { path, secret } : { path })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`revalidate ${path} failed: ${res.status} ${text}`);
    }
    console.log('[autopilot] revalidated', path);
  }
}

const isMain = process.argv[1]?.replace(/\\/g, '/').includes('revalidate-detail-sitemaps');
if (isMain) {
  revalidateScholarshipDetailSitemaps().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
