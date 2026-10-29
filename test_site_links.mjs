// Basic checks for removed personal contact pathways.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
assert.match(read('./public/dev/index.html'), /href="map\/"/);
console.log('No personal contact pathways remain; development concepts use the canonical logo.');
