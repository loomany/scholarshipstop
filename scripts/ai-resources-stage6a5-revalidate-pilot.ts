import { postSeoRevalidate } from '../lib/seo/revalidateSeoPath';

async function main() {
  const paths = [
    '/resources/best-scholarship-websites',
    '/resources'
  ] as const;
  for (const path of paths) {
    const ok = await postSeoRevalidate({
      path,
      tag:
        path === '/resources/best-scholarship-websites'
          ? 'published-content-post-by-slug-v2'
          : undefined
    });
    console.log(`${ok ? 'OK' : 'FAIL'} ${path}`);
  }
}

main();
