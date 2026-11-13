"""PIN login and signed admin sessions, using only the standard library."""
import hashlib
import hmac
from http.cookies import SimpleCookie, CookieError
from http.server import BaseHTTPRequestHandler
import json
import os
import re
import time

COOKIE = '__Host-augment_admin'
LIFETIME = 30 * 24 * 60 * 60


def configured():
    return bool(re.fullmatch(r'[0-9]{4,12}', os.environ.get('ADMIN_PIN', ''))) and len(os.environ.get('ADMIN_SESSION_SECRET', '')) >= 32


def signature(value):
    return hmac.new(os.environ['ADMIN_SESSION_SECRET'].encode(), value.encode(), hashlib.sha256).hexdigest()


def is_admin(headers):
    if not configured():
        return False
    try:
        cookies = SimpleCookie()
        cookies.load(headers.get('Cookie', ''))
        token = cookies[COOKIE].value
        role, expires, digest = token.split('.')
        remaining = int(expires) - int(time.time())
        return role == 'admin' and 0 < remaining <= LIFETIME and hmac.compare_digest(digest, signature(f'{role}.{expires}'))
    except (CookieError, KeyError, ValueError):
        return False


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def reply(self, status, data, cookie=None):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'private, no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        if cookie is not None:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not configured():
            return self.reply(503, {'error': 'Admin login needs server configuration.'})
        self.reply(200, {'admin': is_admin(self.headers)})

    def do_POST(self):
        if self.headers.get('Origin') not in ('https://augment-wh.com', 'https://www.augment-wh.com'):
            return self.reply(403, {'error': 'Please use the website login page.'})
        if not configured():
            return self.reply(503, {'error': 'Admin login needs server configuration.'})
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.reply(415, {'error': 'Use JSON.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 1024:
                return self.reply(413, {'error': 'Invalid request size.'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': 'Invalid request.'})
        attributes = '; Path=/; Secure; HttpOnly; SameSite=Strict'
        if data.get('action') == 'logout':
            return self.reply(200, {'admin': False}, f'{COOKIE}=; Max-Age=0{attributes}')
        pin = data.get('pin')
        if not isinstance(pin, str) or not re.fullmatch(r'[0-9]{4,12}', pin):
            return self.reply(400, {'error': 'Enter your PIN.'})
        # ponytail: fixed delay slows basic guessing; distributed abuse needs Vercel firewall rate limiting.
        time.sleep(1)
        if not hmac.compare_digest(pin, os.environ['ADMIN_PIN']):
            return self.reply(401, {'error': 'Incorrect PIN.'})
        value = f'admin.{int(time.time()) + LIFETIME}'
        self.reply(200, {'admin': True}, f'{COOKIE}={value}.{signature(value)}; Max-Age={LIFETIME}{attributes}')
