// Basic checks for removed personal contact pathways.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
assert.doesNotMatch(read('./public/index.html'), /nathan|tidball|linkedin|meeting|calendar|mailto:/i);
assert.doesNotMatch(read('./public/contact.js'), /nathan|tidball|linkedin|meeting|calendar/i);
assert.doesNotMatch(read('./server.py'), /nathan|tidball|linkedin|booking/i);
console.log('No personal contact pathways remain.');
