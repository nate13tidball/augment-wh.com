import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('./public/assets/site/header-access.js');
for (const page of readdirSync(new URL('./public', import.meta.url), { recursive: true }).filter(p => p.endsWith('.html'))) {
  const html = read('./public/' + page);
  const header = html.split('<!-- shared-header:start -->')[1]?.split('<!-- shared-header:end -->')[0];
  assert(header, page);
  assert.match(header, /class="wh-discuss-site" href="\/#contact">Discuss site /, page);
  assert.match(header, /href="\/presentations\/" data-admin-only hidden/, page);
  if (header.includes('aria-label="Development"')) assert.match(header, /aria-label="Development" data-admin-only hidden/, page);
  assert(html.includes('/assets/site/header-access.js'), page);
}
assert.match(read('./public/assets/site/site.css'), /\.wh-header \[hidden\] \{ display: none !important; \}/);
const handlers = {}, docHandlers = {}, menuHandlers = {}, pending = [];
const items = [{hidden: true}, {hidden: true}];
runInNewContext(source, {
  document: { hidden: false, querySelectorAll: () => items,
    querySelector: () => ({ addEventListener: (name, fn) => {menuHandlers[name] = fn;} }),
    addEventListener: (name, fn) => { docHandlers[name] = fn; } },
  window: { addEventListener: (name, fn) => { handlers[name] = fn; } },
  fetch: (url, options) => {
    assert.equal(url, '/api/admin');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-store');
    return new Promise((resolve, reject) => pending.push({resolve, reject}));
  },
});
const flush = () => new Promise(resolve => setImmediate(resolve));
async function reply(value, ok = true) {
  pending.shift().resolve({ok, json: async () => value}); await flush();
}
const hidden = value => items.forEach(item => assert.equal(item.hidden, value));
hidden(true);
await reply({admin: false}); hidden(true);
handlers.pageshow(); await reply({admin: true}); hidden(false);
handlers['site-admin-change'](); hidden(true); await reply({admin: false}); hidden(true);
menuHandlers.toggle({currentTarget: {open: true}}); await reply({admin: 'true'}); hidden(true);
docHandlers.visibilitychange(); pending.shift().reject(Error('offline')); await flush(); hidden(true);
handlers.pageshow(); await reply({admin: true}, false); hidden(true);
// An older successful request cannot restore links after a newer logout check.
handlers.pageshow(); handlers['site-admin-change']();
const stale = pending.shift(); await reply({admin: false});
stale.resolve({ok: true, json: async () => ({admin: true})}); await flush(); hidden(true);
console.log('PASS: contact button, hidden initial markup, admin/visitor/logout, errors, and stale session responses.');
