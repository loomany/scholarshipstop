import { SEO_ROUTE_STATE_SLUG_TO_LABEL } from '@/lib/scholarships/seoTags/routeSegmentMaps';
import type { SeoHubCostOfLivingJson } from '@/lib/seo/seoHubContentAi';

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

/**
 * Extra prose HTML appended to manifest `supporting` for US state hubs so the block
 * matches the single post-listing SEO column used on routes like `/scholarships/engineering`.
 */
export function buildStateHubSupportingAppendHtml(args: {
  contentHtml: string | null;
  costOfLiving: SeoHubCostOfLivingJson;
  neighborSlugs: string[];
}): string | null {
  const parts: string[] = [];

  const guide = args.contentHtml?.trim();
  if (guide) {
    parts.push(
      `<h2>Studying in this state</h2>\n${guide}`
    );
  }

  const col = args.costOfLiving;
  const hasCol =
    col.average_room_rent_usd_monthly != null ||
    col.typical_lunch_usd != null ||
    col.monthly_transport_usd != null ||
    (col.notes && col.notes.trim().length > 0);

  if (hasCol) {
    const rows = [
      `<tr><td>Room rent (estimate)</td><td>${formatUsd(col.average_room_rent_usd_monthly)}</td></tr>`,
      `<tr><td>Lunch out</td><td>${formatUsd(col.typical_lunch_usd)}</td></tr>`,
      `<tr><td>Transport</td><td>${formatUsd(col.monthly_transport_usd)}</td></tr>`
    ].join('');
    const notes = col.notes?.trim()
      ? `<p>${escapeHtml(col.notes.trim())}</p>`
      : '';
    parts.push(
      `<h2>Cost of living (ballpark)</h2>
<table>
<thead><tr><th>Category</th><th>Typical monthly cost (USD)</th></tr></thead>
<tbody>${rows}</tbody>
</table>${notes}`
    );
  }

  if (args.neighborSlugs.length > 0) {
    const items = args.neighborSlugs
      .map((slug) => {
        const label = escapeHtml(
          SEO_ROUTE_STATE_SLUG_TO_LABEL[slug] ?? slug
        );
        const href = `/scholarships/${encodeURIComponent(slug)}`;
        return `<li><a href="${href}">${label}</a></li>`;
      })
      .join('');
    parts.push(`<h2>Other states you might like</h2><ul>${items}</ul>`);
  }

  if (parts.length === 0) return null;
  return parts.join('\n<hr class="my-8 border-slate-200/80" />\n');
}

export function mergeSeoSupportingWithStateHubAppend(
  seoSupporting: string | null | undefined,
  append: string | null
): string | null {
  const a = seoSupporting?.trim() ?? '';
  const b = append?.trim() ?? '';
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  return `${a}\n<hr class="my-8 border-slate-200/80" />\n${b}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
