import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const customer = read('./public/dev/site-review/index.html');
const investor = read('./public/dev/site-review/investors/index.html');
const map = read('./public/dev/index.html');

for (const [route, html] of [['/dev/site-review/', customer], ['/dev/site-review/investors/', investor]]) {
  assert.ok(map.includes(`href="${route}"`), `${route} is missing from the dev map`);
  assert.match(html, /name="robots" content="noindex, nofollow"/);
  assert.match(html, /id="contact"/);
  assert.match(html, /id="inquiry-form" action="\/api\/inquiry" method="post"/);
  assert.match(html, /src="\/contact\.js"/);
  for (const [, target] of html.matchAll(/<a class="(?:button|text-link)" href="([^"]+)"/g)) {
    assert.equal(target, '#contact', `${route} has a CTA outside its contact flow`);
  }
}
assert.doesNotMatch(customer, /\$3bn|\$13bn|GWh\/year|degraded-capacity-market|investors\//);
assert.match(investor, /modeled 2025 restoration volume/);
assert.match(investor, /not project awards or company revenue/);
console.log('Review previews have distinct audiences and working contact paths.');
