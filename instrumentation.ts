export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { logSeoQueueLoadedOnStartup } = await import('@/lib/seo/seoDripFeed');
    logSeoQueueLoadedOnStartup();
  }
}
