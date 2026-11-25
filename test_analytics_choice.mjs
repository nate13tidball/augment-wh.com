import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./public/assets/analytics/choice.js', import.meta.url), 'utf8');

function visit(hostname, stored = null, pathname = '/') {
  const values = new Map(stored ? [['site-analytics-choice-v1', JSON.stringify(stored)]] : []);
  class Node {
    constructor(tagName) { this.tagName = tagName; this.children = []; this.listeners = {}; this.hidden = false; }
    append(...nodes) { this.children.push(...nodes); }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, handler) { this.listeners[name] = handler; }
    click() { this.listeners.click?.(); }
    focus() {}
  }
  const settings = [new Node('button'), new Node('button')];
  const head = new Node('head');
  const body = new Node('body');
  const document = {
    currentScript: { dataset: { analyticsHosts: 'aaugment.io,www.aaugment.io', analyticsExcludePrefixes: '/dev' } },
    readyState: 'complete', head, body,
    createElement: tagName => new Node(tagName),
    querySelectorAll: () => settings,
  };
  const location = { hostname, pathname, reloads: 0, reload() { this.reloads++; } };
  const context = {
    document, location, Date, JSON,
    localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
    window: { addEventListener() {} },
  };
  runInNewContext(source, context);
  const panel = body.children[0];
  return { panel, settings, head, location, values, context };
}

const first = visit('aaugment.io');
assert.equal(first.head.children.length, 0, 'No analytics request before a choice');
assert.equal(first.panel.hidden, false);
const actions = first.panel.children[2];
actions.children[0].click();
assert.equal(first.head.children.length, 1, 'Allow loads the provider exactly once');
assert.equal(first.head.children[0].src, '/_vercel/insights/script.js');
assert.equal(first.panel.hidden, true);
assert.equal(first.settings[0].textContent, 'Analytics: On');
first.settings[1].click();
actions.children[1].click();
assert.equal(first.location.reloads, 1, 'Decline unloads an active provider');
assert.equal(JSON.parse(first.values.get('site-analytics-choice-v1')).choice, 'decline');

const denied = visit('aaugment.io', { choice: 'decline', expires: Date.now() + 1000 });
assert.equal(denied.head.children.length, 0);
assert.equal(denied.panel.hidden, true);
const expired = visit('aaugment.io', { choice: 'allow', expires: Date.now() - 1000 });
assert.equal(expired.head.children.length, 0);
assert.equal(expired.panel.hidden, false);
const preview = visit('127.0.0.1', { choice: 'allow', expires: Date.now() + 1000 });
assert.equal(preview.head.children.length, 0, 'Local preview must not send analytics');
const development = visit('aaugment.io', { choice: 'allow', expires: Date.now() + 1000 }, '/dev/analytics');
assert.equal(development.head.children.length, 0, 'Development pages must not send analytics');
console.log('Analytics choice gates loading, persists decline, expires, and respects production hosts.');
