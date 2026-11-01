import io
import json
import os
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.parse import parse_qs, urlsplit

from api import analytics


class AnalyticsTests(unittest.TestCase):
    config = {
        'ANALYTICS_VERCEL_TOKEN': 'upstream-test-token',
        'ANALYTICS_PROJECT_ID': 'prj_test',
        'ANALYTICS_DASHBOARD_PASSWORD': 'separate-test-password',
    }

    def request(self, body):
        app = object.__new__(analytics.handler)
        app.headers = {'Content-Length': str(len(body))}
        app.rfile = io.BytesIO(body)
        app.reply = MagicMock()
        app.do_POST()
        return app.reply.call_args.args

    def test_not_configured_never_queries_vercel(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(analytics, 'query') as query:
            self.assertEqual(self.request(b'{}')[0], 503)
            query.assert_not_called()

    def test_password_required_before_upstream_request(self):
        with patch.dict(os.environ, self.config, clear=True), patch.object(analytics, 'query') as query:
            self.assertEqual(self.request(b'{"password":"wrong"}')[0], 401)
            self.assertEqual(self.request(b'{"password":""}')[0], 401)
            for body in (b'[]', b'invalid', b'{"password":42}', b'x' * 4097):
                self.assertEqual(self.request(body)[0], 400)
            query.assert_not_called()

    def test_reports_and_empty_traffic(self):
        totals = {'visitors': 0, 'pageviews': 0}
        with patch.dict(os.environ, self.config, clear=True), patch.object(analytics, 'query', side_effect=[totals, []]) as query:
            status, data = self.request(json.dumps({'password': self.config['ANALYTICS_DASHBOARD_PASSWORD']}).encode())
        self.assertEqual(status, 200)
        self.assertEqual(data['totals'], totals)
        self.assertEqual(data['pages'], [])
        self.assertNotIn('token', json.dumps(data))
        self.assertEqual(query.call_args_list[0].args, ('count',))
        self.assertEqual(query.call_args_list[1].kwargs['by'], 'requestPath')
        self.assertEqual(query.call_args_list[1].kwargs['limit'], 10)
        self.assertEqual((analytics.datetime.fromisoformat(data['until']) - analytics.datetime.fromisoformat(data['since'])).days, 7)

    def test_upstream_error_is_not_zero_and_does_not_leak_secrets(self):
        error = HTTPError('https://api.vercel.com', 403, 'secret-upstream-detail', {}, None)
        with patch.dict(os.environ, self.config, clear=True), patch.object(analytics, 'query', side_effect=error):
            status, data = self.request(json.dumps({'password': self.config['ANALYTICS_DASHBOARD_PASSWORD']}).encode())
        self.assertEqual(status, 502)
        self.assertNotIn('totals', data)
        self.assertNotIn('secret-upstream-detail', json.dumps(data))

    def test_query_uses_fixed_host_project_and_server_token(self):
        for team in ('', 'team_test'):
            with self.subTest(team=team), patch.dict(os.environ, self.config | {'ANALYTICS_TEAM_ID': team}, clear=True), patch.object(analytics, 'urlopen') as urlopen:
                urlopen.return_value.__enter__.return_value = io.BytesIO(b'{"data": {"visitors": 1, "pageviews": 2}}')
                self.assertEqual(analytics.query('count')['pageviews'], 2)
                request = urlopen.call_args.args[0]
                self.assertEqual(request.get_header('Authorization'), 'Bearer upstream-test-token')
                self.assertEqual(urlsplit(request.full_url).netloc, 'api.vercel.com')
                params = parse_qs(urlsplit(request.full_url).query)
                self.assertEqual(params['projectId'], ['prj_test'])
                self.assertEqual(params.get('teamId'), [team] if team else None)
                self.assertNotIn('token', request.full_url)

    def test_response_cannot_be_cached(self):
        app = object.__new__(analytics.handler)
        app.send_response = MagicMock()
        app.send_header = MagicMock()
        app.end_headers = MagicMock()
        app.wfile = io.BytesIO()
        app.reply(200, {'ok': True})
        app.send_header.assert_any_call('Cache-Control', 'private, no-store')
        self.assertEqual(json.loads(app.wfile.getvalue()), {'ok': True})


if __name__ == '__main__':
    unittest.main()
