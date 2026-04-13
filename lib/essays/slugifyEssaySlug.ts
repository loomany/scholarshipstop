export function slugifyEssaySegment(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 72);
}

export function buildDefaultEssaySlugFromScholarshipTitle(title: string): string {
  const base = slugifyEssaySegment(title);
  const core = base || 'scholarship';
  return `how-to-write-${core}-scholarship-essay`;
}
