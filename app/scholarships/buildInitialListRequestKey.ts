/**
 * Server + client: stable list URL identity for matching SSR `initialPayload.requestKey`
 * (must not import server-only code).
 */
export function buildInitialListRequestKey(args: {
  kind: 'hub' | 'long_tail' | 'category';
  routeKey: string;
  searchParamsString?: string;
}): string {
  const search = args.searchParamsString?.trim() ?? '';
  return `${args.kind}:${args.routeKey}:${search}`;
}
