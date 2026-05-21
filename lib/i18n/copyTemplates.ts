/** Interpolate `{key}` placeholders in static UI copy (safe for client components). */
export function applyCopyTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}
