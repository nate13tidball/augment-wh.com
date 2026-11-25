// Basic checks for removed personal contact pathways.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
assert.doesNotMatch(read('./public/index.html'), /nathan|tidball|linkedin|meeting|calendar|mailto:/i);
assert.doesNotMatch(read('./public/contact.js'), /nathan|tidball|linkedin|meeting|calendar/i);
assert.doesNotMatch(read('./server.py'), /nathan|tidball|linkedin|booking/i);
for (const concept of ['deck', 'field', 'memo']) {
  const html = read(`./public/dev/${concept}/index.html`);
  assert.doesNotMatch(html, /nathan|tidball|linkedin|meeting|calendar|mailto:/i);
  assert.match(html, /(?:\.\.\/\.\.\/|\/)assets\/brand\/full-logo\.png/);
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
  assert.equal(html.split('src="/assets/analytics/choice.js"').length - 1, 1, `${filename} needs one analytics choice module`);
  assert.doesNotMatch(html, /<script[^>]+src="\/_vercel\/insights\/script\.js"/);
}
console.log('All HTML pages gate Vercel tracking behind the shared choice module.');

const homepage = read('./public/index.html');
const pagesWorkflow = read('./.github/workflows/pages.yml');
assert.match(pagesWorkflow, /rsync -a --exclude='\/dev\/' public\/ pages-public\//);
assert.doesNotMatch(pagesWorkflow, /--exclude='\/modeling-demos\/'/);
assert.doesNotMatch(homepage, /noindex|(?:src|href)="[^"#]*\/dev\//);
assert.match(homepage, /href="\/solution-explained\/"[^>]*>[\s\S]*?View Technical Solution/);
const solutionPage = read('./public/solution-explained/index.html');
assert.match(solutionPage, /class="solution-deck"/);
assert.match(solutionPage, /src="\/assets\/solution-explained\/deck\.js"/);
const deckSlides = [...solutionPage.matchAll(/src="(\/assets\/solution-explained\/slides\/slide-\d{2}\.(?:gif|png))"/g)];
assert.equal(deckSlides.length, 14);
for (const [, src] of deckSlides) assert.ok(existsSync(`./public${src}`), `missing ${src}`);
assert.equal((solutionPage.match(/<ul class="deck-notes"/g) || []).length, 14);
assert.match(solutionPage, /data-cover="13"/);
assert.match(homepage, /href="\/solution-explained\/"[^>]*>\s*<img src="\/assets\/solution-explained\/slides\/slide-13\.png"/);
assert.match(solutionPage, /This concept model shows how site planning can add batteries as existing capacity declines/);
assert.match(solutionPage, /href="\/#contact">Discuss a site/);
assert.match(homepage, /id="inquiry-form"/);
assert.match(homepage, /id="contact"/);
assert.match(homepage, /src="\/contact.js"/);
assert.match(read('./public/dev/previous-home/index.html'), /noindex, nofollow/);
assert.match(devIndex, /href="\/dev\/previous-home\/"/);
console.log('Homepage is public with its inquiry form; previous homepage is retained under dev.');
