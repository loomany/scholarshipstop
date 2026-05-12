import assert from 'node:assert/strict';
import test from 'node:test';

import {
  explainTrafficReason,
  getClientIpFromHeaders,
  getCountryFromHeaders,
  maskIp,
  summarizeUserAgent
} from '@/lib/analytics/visitorDiagnostics';

test('maskIp masks IPv4', () => {
  assert.equal(maskIp('123.45.67.89'), '123.45.xxx.xxx');
  assert.equal(maskIp('  '), null);
  assert.equal(maskIp(null), null);
});

test('maskIp masks IPv6 loosely', () => {
  assert.equal(maskIp('2001:0db8:85a3:0000:0000:8a2e:0370:7334'), '2001:0db8:xxxx');
});

test('getClientIpFromHeaders prefers cf-connecting-ip', () => {
  const h = new Headers({
    'cf-connecting-ip': '1.2.3.4',
    'x-forwarded-for': '9.9.9.9, 8.8.8.8'
  });
  assert.equal(getClientIpFromHeaders(h), '1.2.3.4');
});

test('getClientIpFromHeaders parses x-forwarded-for first hop', () => {
  const h = new Headers({ 'x-forwarded-for': '  203.0.113.1, 10.0.0.1 ' });
  assert.equal(getClientIpFromHeaders(h), '203.0.113.1');
});

test('getCountryFromHeaders reads cf-ipcountry', () => {
  const h = new Headers({ 'cf-ipcountry': 'us' });
  assert.equal(getCountryFromHeaders(h), 'US');
});

test('summarizeUserAgent: CrOS Chrome desktop', () => {
  const ua =
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
  const s = summarizeUserAgent(ua);
  assert.equal(s.os, 'ChromeOS');
  assert.match(s.browser, /Chrome 147/);
  assert.equal(s.deviceType, 'desktop');
  assert.equal(s.botName, null);
});

test('summarizeUserAgent: iPhone Safari mobile', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7.3 Mobile/15E148 Safari/604.1';
  const s = summarizeUserAgent(ua);
  assert.equal(s.os, 'iOS');
  assert.match(s.browser, /Safari/);
  assert.equal(s.deviceType, 'mobile');
});

test('summarizeUserAgent: Snapchat in-app', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1 Snapchat/13.39.0.44 (like Safari/8618.3.11.10.5, panda)';
  const s = summarizeUserAgent(ua);
  assert.equal(s.botName, null);
  assert.equal(s.browser, 'Snapchat in-app');
  assert.equal(s.deviceType, 'mobile');
});

test('summarizeUserAgent: AdsBot-Google', () => {
  const ua =
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.137 Mobile Safari/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)';
  const s = summarizeUserAgent(ua);
  assert.equal(s.botName, 'AdsBot-Google');
});

test('summarizeUserAgent: meta-externalagent', () => {
  const ua =
    'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)';
  const s = summarizeUserAgent(ua);
  assert.equal(s.botName, 'Meta external agent');
});

test('summarizeUserAgent: empty UA', () => {
  const s = summarizeUserAgent('');
  assert.equal(s.deviceType, 'unknown');
  assert.equal(s.botName, null);
});

test('explainTrafficReason: no referrer or UTM', () => {
  const r = explainTrafficReason({
    landingUrl: 'https://scholarshiptop.com/hub',
    referrer: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    userAgentSummary: summarizeUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0')
  });
  assert.match(r, /No referrer or UTM/i);
});

test('explainTrafficReason: google ads params', () => {
  const r = explainTrafficReason({
    landingUrl: 'https://x.com/?gclid=abc123',
    referrer: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    userAgentSummary: summarizeUserAgent('Mozilla/5.0')
  });
  assert.match(r, /Google Ads click id/i);
});
