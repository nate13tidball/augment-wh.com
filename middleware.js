// Vercel routing middleware runs before serving static development files.
export const config = { matcher: ['/dev/:path*', '/api/analytics/:path*'] };
const lifetime = 30 * 24 * 60 * 60;
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

async function isAdmin(request) {
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 32 || !/^[0-9]{4,12}$/.test(process.env.ADMIN_PIN || '')) return false;
  const cookie = (request.headers.get('cookie') || '').split(';')
    .map(value => value.trim()).find(value => value.startsWith('__Host-augment_admin='));
  const token = cookie?.slice('__Host-augment_admin='.length);
  const match = /^admin\.([0-9]+)\.([a-f0-9]{64})$/.exec(token || '');
  if (!match) return false;
  const remaining = Number(match[1]) - Math.floor(Date.now() / 1000);
  if (remaining <= 0 || remaining > lifetime) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const digest = Uint8Array.from(match[2].match(/../g), byte => parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', key, digest, encoder.encode(`admin.${match[1]}`));
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const loginPaths = ['/dev/login', '/dev/login/', '/dev/login/index.html', '/dev/login/login.js'];
  if (loginPaths.includes(url.pathname)) {
    return new Response(null, { headers: { 'x-middleware-next': '1', ...privateHeaders } });
  }
  if (await isAdmin(request)) {
    return new Response(null, { headers: { 'x-middleware-next': '1', ...privateHeaders } });
  }
  if (url.pathname.startsWith('/api/')) {
    return Response.json({ error: 'Admin login required.' }, { status: 401, headers: privateHeaders });
  }
  const login = new URL('/dev/login/', url);
  login.searchParams.set('next', url.pathname + url.search);
  return new Response(null, { status: 302, headers: { Location: login.toString(), ...privateHeaders } });
}
