// Run with `node test_site_links.mjs`; no network requests or dependencies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const script = read('./public/site-links.js');
const saved = JSON.parse(read('./public/site-config.json'));
for (const source of [
  'https://augment-wh.com/site-links.js',
  'https://www.augment-wh.com/site-links.js',
  'http://127.0.0.1:8092/site-links.js',
  'http://localhost:8093/site-links.js',
  'http://[::1]:8092/site-links.js',
  'https://example.github.io/repo/site-links.js',
]) {
  for (const config of [saved, {email:'changed@example.com', emailCc:'', meetingUrl:'https://example.com/meet', bookingUrl:'https://example.com/calendar'}]) {
    for (const redirect of [false, true]) {
      const links = ['email', 'meetingUrl', 'bookingUrl'].map(contactLink => ({dataset:{contactLink}}));
      let destination;
      runInNewContext(script, {
        URL, URLSearchParams,
        document: {
          currentScript: {src:source},
          querySelectorAll: () => links,
          body: {hasAttribute: () => redirect},
        },
        fetch: async (url, options) => {
          assert.equal(url.href, new URL('site-config.json', source).href);
          assert.equal(options.cache, 'no-store');
          return {ok:true, json:async () => config};
        },
        location: {replace: url => { destination = url; }},
      });
      await new Promise(resolve => setImmediate(resolve));
      const email = new URL(links[0].href);
      assert.equal(email.protocol, 'mailto:');
      assert.equal(email.pathname, config.email);
      assert.equal(email.searchParams.get('cc'), config.emailCc || null);
      assert.equal(links[1].href, new URL(config.meetingUrl, source).href);
      assert.equal(links[2].href, config.bookingUrl);
      assert.equal(destination, redirect ? config.bookingUrl : undefined);
    }
  }
}
const status = {};
runInNewContext(script, {
  URL,
  document: {currentScript:{src:'https://example.com/site-links.js'}, querySelector:()=>status},
  fetch:async () => ({ok:false}),
});
await new Promise(resolve => setImmediate(resolve));
assert.match(status.textContent, /could not load/);
assert.doesNotMatch(read('./public/index.html').replace(/<[^>]*>/g, ''), /\bnathan\b/i);
assert.doesNotMatch(read('./public/contact.js'), /\bnathan\b/i);
console.log('Email CC, local/production/prefixed booking links, redirects, failure handling, and company wording passed.');
