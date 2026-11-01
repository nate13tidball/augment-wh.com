"""Private, read-only Vercel Web Analytics proxy. No third-party dependencies."""
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler
import hmac
import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def query(resource, **params):
    params['projectId'] = os.environ['ANALYTICS_PROJECT_ID']
    if os.environ.get('ANALYTICS_TEAM_ID'):
        params['teamId'] = os.environ['ANALYTICS_TEAM_ID']
    request = Request(
        'https://api.vercel.com/v1/query/web-analytics/visits/' + resource + '?' + urlencode(params),
        headers={'Authorization': 'Bearer ' + os.environ['ANALYTICS_VERCEL_TOKEN']},
    )
    with urlopen(request, timeout=10) as response:
        return json.load(response)['data']


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass  # Never log passwords, requests, or upstream credentials.

    def reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'private, no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(405, {'error': 'Use the dashboard to load analytics.'})

    def do_POST(self):
        required = ('ANALYTICS_DASHBOARD_PASSWORD', 'ANALYTICS_VERCEL_TOKEN', 'ANALYTICS_PROJECT_ID')
        if not all(os.environ.get(key) for key in required):
            return self.reply(503, {'error': 'Not connected yet. Complete the setup steps below, then redeploy.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 4096:
                return self.reply(400, {'error': 'Invalid request.'})
            payload = json.loads(self.rfile.read(length))
            password = payload.get('password') if isinstance(payload, dict) else None
            if not isinstance(password, str):
                return self.reply(400, {'error': 'Enter your dashboard password.'})
        except (ValueError, UnicodeError):
            return self.reply(400, {'error': 'Invalid request.'})
        if not hmac.compare_digest(password.encode(), os.environ['ANALYTICS_DASHBOARD_PASSWORD'].encode()):
            return self.reply(401, {'error': 'Dashboard password incorrect.'})
        until = datetime.now(timezone.utc)
        since = until - timedelta(days=7)
        try:
            totals = query('count')
            pages = query('aggregate', since=since.isoformat(), until=until.isoformat(), by='requestPath', limit=10)
        except HTTPError as error:
            message = 'Vercel rejected the request. Check token access, project/team IDs, and that Web Analytics is enabled.'
            if error.code == 429:
                message = 'Vercel rate limit reached. Please try again later.'
            return self.reply(502, {'error': message})
        except (URLError, TimeoutError, OSError, ValueError, KeyError):
            return self.reply(502, {'error': 'Could not load analytics from Vercel. Please try again later.'})
        self.reply(200, {'totals': totals, 'pages': pages, 'since': since.isoformat(), 'until': until.isoformat()})
