/** Monday YYYY-MM-DD in America/New_York (week bucket for dedup). */
export function getEasternMondayYmd(now: Date = new Date()): string {
  for (let delta = 0; delta < 7; delta++) {
    const t = new Date(now.getTime() - delta * 24 * 60 * 60 * 1000);
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short'
    }).format(t);
    if (wd === 'Mon') {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(t);
    }
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}
