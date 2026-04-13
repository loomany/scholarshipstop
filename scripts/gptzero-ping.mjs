/**
 * Проверка доступа к GPTZero с той же машины, что и `next dev` / CI.
 * Запуск: npm run gptzero:ping
 *
 * Если видите HTML или не-JSON — проблема в сети/ключе/регионе, не в React.
 */
const url = 'https://api.gptzero.me/v2/predict/text';
const key = process.env.GPTZERO_API_KEY?.trim();
const version =
  process.env.GPTZERO_MODEL_VERSION?.trim() || '2026-03-30-base';

if (!key) {
  console.error('GPTZERO_API_KEY не задан. Используйте: npm run gptzero:ping');
  process.exit(1);
}

const res = await fetch(url, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'x-api-key': key
  },
  body: JSON.stringify({
    document: 'Short test sentence for API connectivity.',
    version
  })
});

const text = await res.text();
const ct = res.headers.get('content-type');
const cfRay = res.headers.get('cf-ray');

console.log('status:', res.status);
console.log('content-type:', ct);
console.log('cf-ray:', cfRay);
console.log('--- body (first 500 chars) ---');
console.log(text.slice(0, 500));

const looksJson = text.trimStart().startsWith('{') || text.trimStart().startsWith('[');
if (!looksJson && (text.trimStart().startsWith('<') || text.includes('<!DOCTYPE'))) {
  console.error('\n[FAIL] Ответ похож на HTML, не JSON. VPN/другой регион или поддержка GPTZero.');
  process.exit(2);
}
if (!res.ok) {
  console.error('\n[FAIL] HTTP не OK');
  process.exit(2);
}
try {
  const j = JSON.parse(text);
  const d0 = j.documents?.[0];
  if (d0) {
    console.log('\ndocuments[0] keys:', Object.keys(d0));
    console.log('class_probabilities:', d0.class_probabilities);
  }
} catch {
  /* ignore */
}
console.log('\n[OK] Похоже на JSON-ответ API.');
