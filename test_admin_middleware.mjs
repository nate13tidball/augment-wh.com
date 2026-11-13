import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const source = readFileSync(new URL('./middleware.js', import.meta.url), 'utf8');
const { default: middleware, config } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
assert.deepEqual(config.matcher, ['/dev/:path*', '/api/analytics/:path*']);
process.env.ADMIN_PIN = '9876';
process.env.ADMIN_SESSION_SECRET = 'test-secret-'.repeat(5);
// Use the actual Python issuer to check compatibility with the Vercel gate.
const cookie = execFileSync('python3', ['-c', `
from api.admin import signature, LIFETIME, COOKIE
import time
value = f'admin.{int(time.time()) + LIFETIME}'
print(f'{COOKIE}={value}.{signature(value)}')
`], { encoding: 'utf8' }).trim();
const request = (path, token = '') => middleware(new Request('https://www.augment-wh.com' + path, { headers: { Cookie: token } }));
const pages = readdirSync(new URL('./public/dev/', import.meta.url), { recursive: true })
  .filter(path => !path.startsWith('login/') && path !== 'login')
  .map(path => '/dev/' + path);
for (const path of ['/dev', '/dev/', '/dev/analytics', '/dev/new-page', ...pages]) {
  const denied = await request(path);
  assert.equal(denied.status, 302, path);
  assert.equal(new URL(denied.headers.get('location')).pathname, '/dev/login/');
  assert.equal(denied.headers.get('cache-control'), 'private, no-store');
  const allowed = await request(path, cookie);
  assert.equal(allowed.headers.get('x-middleware-next'), '1', path);
  assert.equal(allowed.headers.get('cache-control'), 'private, no-store');
}
for (const path of ['/dev/login', '/dev/login/', '/dev/login/index.html', '/dev/login/login.js']) {
  assert.equal((await request(path)).headers.get('x-middleware-next'), '1', path);
}
for (const token of ['', cookie + 'x', cookie.replace('admin.', 'visitor.'), '__Host-augment_admin=admin.1.' + '0'.repeat(64)]) {
  assert.equal((await request('/dev/', token)).status, 302);
  assert.equal((await request('/api/analytics', token)).status, 401);
}
assert.equal((await request('/api/analytics', cookie)).headers.get('x-middleware-next'), '1');
process.env.ADMIN_SESSION_SECRET = '';
assert.equal((await request('/dev/', cookie)).status, 302);
assert.equal((await request('/dev/login/')).headers.get('x-middleware-next'), '1');
console.log('Every development file is gated; login remains accessible; Python-issued cookies pass verification.');
