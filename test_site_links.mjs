// Run with `node test_site_links.mjs`; no network requests or dependencies.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('./public/site-links.js', import.meta.url), 'utf8');
const saved = JSON.parse(readFileSync(new URL('./public/site-config.json', import.meta.url), 'utf8'));
for (const config of [saved, {email:'changed@example.com', meetingUrl:'https://example.com/meet', bookingUrl:'https://example.com/calendar'}]) {
  for (const redirect of [false, true]) {
    const links = ['email', 'meetingUrl', 'bookingUrl'].map(contactLink => ({dataset:{contactLink}}));
    let destination;
    runInNewContext(script, {
      URL,
      document: {
        currentScript: {src:'https://example.com/repo/site-links.js'},
        querySelectorAll: () => links,
        body: {hasAttribute: () => redirect},
      },
      fetch: async (url, options) => {
        assert.equal(url.href, 'https://example.com/repo/site-config.json');
        assert.equal(options.cache, 'no-store');
        return {ok:true, json:async () => config};
      },
      location: {replace: url => { destination = url; }},
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(links.map(link => link.href), [`mailto:${config.email}`, config.meetingUrl, config.bookingUrl]);
    assert.equal(destination, redirect ? config.bookingUrl : undefined);
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
console.log('Contact configuration, changed destinations, booking redirect, and load failure passed.');
