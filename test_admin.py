"""Exercise login in memory without starting a server or using real credentials."""
import io
import json
import os
import unittest
from unittest.mock import patch
from api import admin


class AdminTests(unittest.TestCase):
    def request(self, method='GET', data=None, cookie='', origin='https://www.augment-wh.com'):
        app = object.__new__(admin.handler)
        body = json.dumps(data).encode() if data is not None else b''
        app.headers = {'Cookie': cookie, 'Origin': origin, 'Content-Type': 'application/json', 'Content-Length': str(len(body))}
        app.rfile, app.wfile = io.BytesIO(body), io.BytesIO()
        response = {}
        app.send_response = lambda status: response.update(status=status)
        app.send_header = lambda key, value: response.update({key: value})
        app.end_headers = lambda: None
        getattr(app, 'do_' + method)()
        response['body'] = json.loads(app.wfile.getvalue())
        self.assertEqual(response['Cache-Control'], 'private, no-store')
        return response

    @patch.dict(os.environ, {'ADMIN_PIN': '9876', 'ADMIN_SESSION_SECRET': 's' * 48}, clear=True)
    @patch.object(admin.time, 'sleep')
    def test_login_cookie_validation_logout_and_boundaries(self, delay):
        self.assertFalse(self.request()['body']['admin'])
        self.assertEqual(self.request('POST', {'pin': '0000'})['status'], 401)
        self.assertEqual(self.request('POST', {'pin': 9876})['status'], 400)
        self.assertEqual(self.request('POST', [])['status'], 400)
        self.assertEqual(self.request('POST', {'pin': '9876'}, origin='https://evil.test')['status'], 403)
        login = self.request('POST', {'pin': '9876'})
        self.assertEqual(login['status'], 200)
        cookie = login['Set-Cookie']
        for attribute in ('Max-Age=2592000', 'Path=/', 'Secure', 'HttpOnly', 'SameSite=Strict'):
            self.assertIn(attribute, cookie)
        self.assertNotIn('9876', cookie)
        self.assertNotIn('Domain=', cookie)
        cookie = cookie.split(';')[0]
        self.assertTrue(self.request(cookie=cookie)['body']['admin'])
        self.assertFalse(self.request(cookie=cookie + 'tampered')['body']['admin'])
        self.assertFalse(self.request(cookie=admin.COOKIE + '=admin.bad.bad')['body']['admin'])
        with patch.object(admin.time, 'time', return_value=admin.time.time() + admin.LIFETIME + 1):
            self.assertFalse(self.request(cookie=cookie)['body']['admin'])
        with patch.dict(os.environ, {'ADMIN_SESSION_SECRET': 'rotated' * 8}):
            self.assertFalse(self.request(cookie=cookie)['body']['admin'])
        logout = self.request('POST', {'action': 'logout'}, cookie=cookie)
        self.assertFalse(logout['body']['admin'])
        self.assertIn('Max-Age=0', logout['Set-Cookie'])

    def test_missing_configuration_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.request()['status'], 503)
            self.assertEqual(self.request('POST', {'pin': '9876'})['status'], 503)
            self.assertFalse(admin.is_admin({}))


if __name__ == '__main__':
    unittest.main()
