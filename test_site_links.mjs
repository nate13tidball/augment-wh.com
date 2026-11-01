// Basic checks for removed personal contact pathways.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
assert.doesNotMatch(read('./public/index.html'), /nathan|tidball|linkedin|meeting|calendar|mailto:/i);
assert.doesNotMatch(read('./public/contact.js'), /nathan|tidball|linkedin|meeting|calendar/i);
assert.doesNotMatch(read('./server.py'), /nathan|tidball|linkedin|booking/i);
for (const concept of ['deck', 'field', 'memo']) {
  const html = read(`./public/dev/${concept}/index.html`);
  assert.doesNotMatch(html, /nathan|tidball|linkedin|meeting|calendar|mailto:/i);
  assert.match(html, /\.\.\/\.\.\/assets\/brand\/full-logo\.png/);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
}
const devIndex = read('./public/dev/index.html');
assert.match(devIndex, /<h1>Site map<\/h1>/);
for (const route of ['/', '/dev/', '/dev/deck/', '/dev/field/', '/dev/memo/', '/dev/analytics', '/presentations/']) {
  assert.ok(devIndex.includes(`href="${route}"`), `Page tree is missing ${route}`);
}
const redirect = devIndex.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const pathname of ['/dev', '/dev/']) {
  const destinations = [];
  runInNewContext(redirect, { location: {
    pathname, search: '?test=1', hash: '#tree', replace: url => destinations.push(url),
  } });
  assert.deepEqual(destinations, pathname === '/dev' ? ['/dev/?test=1#tree'] : []);
}
console.log('No personal contact pathways remain; development concepts use the canonical logo.');

const analytics = read('./public/dev/analytics/index.html');
assert.match(analytics, /aria-current="page">Analytics/);
assert.match(analytics, /name="robots" content="noindex, nofollow"/);
assert.match(read('./public/dev/map/index.html'), /href="\/dev\/analytics"/);
assert.doesNotMatch(read('./public/dev/analytics/analytics.js'), /localStorage|sessionStorage|innerHTML/);
assert.doesNotMatch(analytics, /type="password"|ANALYTICS_DASHBOARD_PASSWORD/);
assert.match(read('./public/dev/analytics/analytics.js'), /loadAnalytics\(\);/);

const canonicalRedirect = analytics.match(/<script>([\s\S]*?)<\/script>/)[1];
for (const pathname of ['/dev/analytics', '/dev/analytics/']) {
  const destinations = [];
  runInNewContext(canonicalRedirect, { location: {
    pathname, search: '?test=1', hash: '#pages', replace: url => destinations.push(url),
  } });
  assert.deepEqual(destinations, pathname.endsWith('/') ? ['/dev/analytics?test=1#pages'] : []);
}
for (const filename of readdirSync(new URL('./public/', import.meta.url), { recursive: true }).filter(path => path.endsWith('.html'))) {
  const html = read(`./public/${filename}`);
  assert.equal(html.split('src="/_vercel/insights/script.js"').length - 1, 1, `${filename} must track page views exactly once`);
  const setup = html.match(/<script>\s*(window\.va = [\s\S]*?)<\/script>/)?.[1];
  assert.ok(setup, `${filename} is missing the Vercel Analytics queue`);
  const window = {};
  runInNewContext(setup, { window });
  window.va('event', { name: 'test' });
  assert.equal(window.vaq.length, 1);
  assert.equal(window.vaq[0][0], 'event');
}
console.log('All HTML pages include Vercel tracking once; analytics URL is canonical without a trailing slash.');
