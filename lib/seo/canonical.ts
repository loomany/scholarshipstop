const CANONICAL_ORIGIN = 'https://scholarshiptop.com';

export function getCanonical(path: string = '/'): string {
  const raw = path.trim() || '/';
  let pathname = raw;

  try {
    const parsed = new URL(raw);
    pathname = parsed.pathname;
  } catch {
    pathname = raw.split(/[?#]/, 1)[0] || '/';
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const cleanPath =
    normalizedPath === '/' ? '/' : normalizedPath.replace(/\/+$/, '');

  return `${CANONICAL_ORIGIN}${cleanPath}`;
}
