#!/usr/bin/env node
/** Read-only DNS/HTTP inventory for cutover planning */
const domains = ['scholarshiptop.com', 'www.scholarshiptop.com'];

async function head(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { 'User-Agent': 'CutoverInventory/1.0' } });
  const h = (k) => res.headers.get(k);
  return {
    url,
    status: res.status,
    location: h('location'),
    server: h('server'),
    cfRay: h('cf-ray'),
    cfCache: h('cf-cache-status'),
    altSvc: h('alt-svc'),
  };
}

async function tlsInfo(host) {
  // indirect: fetch cert chain info via response
  const res = await fetch(`https://${host}/`, { redirect: 'manual' });
  return { host, status: res.status, server: res.headers.get('server'), cfRay: res.headers.get('cf-ray') };
}

async function main() {
  const httpRoot = await head('http://scholarshiptop.com/');
  const httpWww = await head('http://www.scholarshiptop.com/');
  const httpsRoot = await head('https://scholarshiptop.com/');
  const httpsWww = await head('https://www.scholarshiptop.com/');
  const httpIp = await head('http://213.155.22.74/');
  console.log(JSON.stringify({ httpRoot, httpWww, httpsRoot, httpsWww, httpIp }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
