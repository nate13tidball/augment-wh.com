// Run with `node test_site_links.mjs`; no network requests or dependencies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('./public/index.html');
assert.doesNotMatch(html, /nathan|tidball|linkedin|meeting|calendar|mailto:/i);
assert.doesNotMatch(read('./public/contact.js'), /nathan|tidball|linkedin|meeting|calendar/i);
assert.doesNotMatch(read('./server.py'), /nathan|tidball|linkedin|booking/i);
assert.doesNotMatch(read('./README.md'), /nathan|tidball|linkedin|calendar|booking/i);
console.log('No personal identity, LinkedIn, meeting, or calendar links remain in the public/contact flow.');
