"""Read-only Vercel Web Analytics proxy. No third-party dependencies."""
from api.admin import is_admin
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler
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
        pass  # Never log requests or upstream credentials.

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
        if not is_admin(self.headers):
            return self.reply(401, {'error': 'Admin login required.'})
        required = ('ANALYTICS_VERCEL_TOKEN', 'ANALYTICS_PROJECT_ID')
        if not all(os.environ.get(key) for key in required):
            return self.reply(503, {'error': 'Not connected yet. Complete the setup steps below, then redeploy.'})
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
