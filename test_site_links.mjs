// Basic checks for removed personal contact pathways.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
for (const route of ['/', '/dev/', '/dev/deck/', '/dev/field/', '/dev/memo/', '/presentations/']) {
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
