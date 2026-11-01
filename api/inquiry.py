"""Vercel serverless endpoint for website inquiries."""
import json
from http.server import BaseHTTPRequestHandler
import time

import server


ORIGINS = {'https://augment-wh.com', 'https://www.augment-wh.com'}


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        # Never log visitor data or inquiry contents.
        pass

    def reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.headers.get('Origin') not in ORIGINS:
            return self.reply(403, {'error': 'Please submit through our website.'})
        if self.headers.get('Content-Type', '').split(';')[0].strip() != 'application/json':
            return self.reply(415, {'error': 'Unsupported submission format.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 32768:
                return self.reply(413, {'error': 'Your inquiry is too large.'})
            data = server.validate(json.loads(self.rfile.read(length)))
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': 'Please check your email, name, and inquiry details.'})
        if data['website']:
            return self.reply(400, {'error': 'Unable to accept this submission.'})

        # Basic process-local limit; use Vercel Firewall for distributed abuse controls.
        with server.lock:
            now = time.monotonic()
            server.attempts[:] = [stamp for stamp in server.attempts if now - stamp < 3600]
            if len(server.attempts) >= 20:
                return self.reply(429, {'error': 'Too many inquiries. Please try again later.'})
            server.attempts.append(now)
        try:
            server.send_inquiry(data)
        except Exception:
            return self.reply(503, {'error': 'Email delivery is unavailable. Please try again later.'})
        self.reply(200, {'ok': True})
