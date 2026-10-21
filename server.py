"""Static website and SMTP inquiry endpoint. Run behind an HTTPS reverse proxy."""
import json
import os
import re
import smtplib
import ssl
import time
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import urlsplit
import mimetypes

PUBLIC = Path(__file__).resolve().parent / 'public'
KINDS = {'General inquiry', 'Request a quote', 'Discuss augmentation'}
LIMITS = {'name': 120, 'email': 254, 'company': 180, 'kind': 40, 'message': 5000, 'website': 200}
lock = Lock()
attempts = []


def validate(data):
    if not isinstance(data, dict):
        raise ValueError('Invalid inquiry.')
    values = {}
    for key, limit in LIMITS.items():
        value = data.get(key, '')
        if not isinstance(value, str) or len(value) > limit or '\x00' in value:
            raise ValueError('Please check the length and format of your details.')
        values[key] = value.strip()
    if not values['name'] or len(values['message']) < 10 or values['kind'] not in KINDS:
        raise ValueError('Please provide your name, inquiry type, and project details.')
    if not re.fullmatch(r'[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+', values['email']):
        raise ValueError('Please enter a valid email address.')
    if any(c in values['email'] for c in '\r\n'):
        raise ValueError('Please enter a valid email address.')
    return values


def send_inquiry(values):
    required = ('SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'INQUIRY_FROM', 'INQUIRY_TO')
    if not all(os.environ.get(key) for key in required):
        raise RuntimeError('Email delivery is not configured.')
    message = EmailMessage()
    message['From'] = os.environ['INQUIRY_FROM']
    message['To'] = os.environ['INQUIRY_TO']
    message['Reply-To'] = values['email']
    message['Subject'] = '[Augment Wh] ' + values['kind']
    message.set_content('\n'.join([
        'New website inquiry', '', 'Name: ' + values['name'],
        'Email: ' + values['email'], 'Company: ' + (values['company'] or 'Not provided'),
        'Type: ' + values['kind'], '', values['message'],
    ]))
    context = ssl.create_default_context()
    implicit_tls = os.environ.get('SMTP_TLS', 'starttls') == 'implicit'
    client = smtplib.SMTP_SSL if implicit_tls else smtplib.SMTP
    options = {'timeout': 15}
    if implicit_tls:
        options['context'] = context
    with client(os.environ['SMTP_HOST'], int(os.environ.get('SMTP_PORT', '465' if implicit_tls else '587')), **options) as smtp:
        if not implicit_tls:
            smtp.starttls(context=context)
        smtp.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
        if smtp.send_message(message):
            raise RuntimeError('Recipient refused.')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        # Do not log visitor data, query strings, message bodies, or credentials.
        pass

    def setup(self):
        super().setup()
        self.connection.settimeout(10)

    def reply(self, status, data, content_type='application/json'):
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # An explicit public-file list prevents traversal and accidental repo exposure.
        path = urlsplit(self.path).path
        if path.startswith('/presentations/'):
            parts = path.removeprefix('/presentations/').strip('/').split('/')
            companies = json.loads((PUBLIC / 'presentations/companies.json').read_text())
            company = next((item for item in companies if item['slug'] == parts[0].lower()), None)
            if company and len(parts) == 1 and not path.endswith('/'):
                self.send_response(308)
                self.send_header('Location', f"/presentations/{company['slug']}/")
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            if company and len(parts) == 1 and path.endswith('/'):
                return self.reply(200, (PUBLIC / 'presentations/template.html').read_bytes(), 'text/html; charset=utf-8')
            custom = company.get('presentation') if company else None
            custom_path = f"/presentations/{company['slug']}/{custom}" if isinstance(custom, str) and custom and Path(custom).name == custom else None
            if company and custom_path == path:
                filename = (PUBLIC / path.lstrip('/')).resolve()
                if filename.is_relative_to(PUBLIC) and filename.is_file():
                    content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
                    return self.reply(200, filename.read_bytes(), content_type)
            if company:
                return self.reply(404, (PUBLIC / '404.html').read_bytes(), 'text/html; charset=utf-8')
        if path in ('/meet', '/meet/', '/meet/index.html'):
            try:
                destination = json.loads((PUBLIC / 'site-config.json').read_text())['bookingUrl']
                if urlsplit(destination).scheme != 'https' or any(c in destination for c in '\r\n'):
                    raise ValueError('Invalid booking URL.')
            except (OSError, ValueError, KeyError, TypeError):
                return self.reply(503, b'Booking is unavailable. Please try again later.', 'text/plain')
            self.send_response(302)
            self.send_header('Location', destination)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        files = {'/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css',
                 '/email': 'email/index.html', '/email/': 'email/index.html',
                 '/email/index.html': 'email/index.html',
                 '/contact.js': 'contact.js', '/site-links.js': 'site-links.js',
                 '/presentations/': 'presentations/index.html',
                 '/presentations/index.html': 'presentations/index.html',
                 '/presentations/companies.json': 'presentations/companies.json',
                 '/presentations/directory.js': 'presentations/directory.js',
                 '/presentations/presentation.css': 'presentations/presentation.css',
                 '/presentations/presentation.js': 'presentations/presentation.js',
                 '/site-config.json': 'site-config.json', '/interactions.js': 'interactions.js',
                 '/assets/favicon.svg': 'assets/favicon.svg'}
        for asset in ('header.png', 'lettermark.png', 'wordmark.png', 'lockup.png', 'favicon.png', 'manifest.json'):
            files[f'/assets/brand/{asset}'] = f'assets/brand/{asset}'
        filename = files.get(path, '404.html')
        content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        self.reply(200 if path in files else 404, (PUBLIC / filename).read_bytes(), content_type)

    def do_POST(self):
        if self.path != '/api/inquiry':
            return self.reply(404, {'error': 'Not found.'})
        origins = os.environ.get('INQUIRY_ORIGINS', 'https://augment-wh.com,https://www.augment-wh.com').split(',')
        if self.headers.get('Origin') not in origins:
            return self.reply(403, {'error': 'Please submit through our website.'})
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
            return self.reply(415, {'error': 'Unsupported submission format.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 32768:
                return self.reply(413, {'error': 'Your inquiry is too large.'})
            data = validate(json.loads(self.rfile.read(length)))
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': 'Please check your email, name, and project details.'})
        if data['website']:
            return self.reply(400, {'error': 'Unable to accept this submission.'})
        # A bounded global limit works behind a local proxy without trusting spoofed IP headers.
        with lock:
            now = time.monotonic()
            attempts[:] = [stamp for stamp in attempts if now - stamp < 3600]
            if len(attempts) >= 20:
                return self.reply(429, {'error': 'Too many inquiries. Please try later or contact us on LinkedIn.'})
            attempts.append(now)
        try:
            send_inquiry(data)
        except Exception:
            return self.reply(503, {'error': 'Email delivery is unavailable. Please try later or contact us on LinkedIn.'})
        self.reply(200, {'ok': True})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8091'))
    print(f'Augment Wh: http://127.0.0.1:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
