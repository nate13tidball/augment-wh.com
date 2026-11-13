import json
import os
import tempfile
import unittest
from http.client import HTTPConnection
from pathlib import Path
from threading import Thread
from unittest.mock import patch, MagicMock

import server


class InquiryTests(unittest.TestCase):
    def test_validation(self):
        valid = dict(name='Test Visitor', email='visitor@example.com', kind='Request a quote', message='A test project inquiry.')
        self.assertEqual(server.validate(valid)['company'], '')
        for override in ({'email': 'bad'}, {'email': 'a@b.com\r\nBcc: bad@example.com'}, {'message': 'short'}, {'kind': 'Unknown'}, {'name': 'x' * 121}):
            with self.assertRaises(ValueError):
                server.validate(valid | override)

    def test_delivery_headers_and_tls(self):
        config = dict(SMTP_HOST='smtp.example.com', SMTP_USER='user', SMTP_PASSWORD='test', INQUIRY_FROM='site@example.com', INQUIRY_TO='owner@example.com')
        smtp = MagicMock()
        smtp.__enter__.return_value = smtp
        smtp.send_message.return_value = {}
        with patch.dict(os.environ, config, clear=True), patch('server.smtplib.SMTP', return_value=smtp):
            server.send_inquiry(server.validate(dict(name='Visitor', email='visitor@example.com', kind='Request a quote', message='A test project inquiry.')))
        smtp.starttls.assert_called_once()
        message = smtp.send_message.call_args.args[0]
        self.assertEqual(message['To'], 'owner@example.com')
        self.assertEqual(message['Reply-To'], 'visitor@example.com')

    def test_graph_delivery_and_partial_configuration(self):
        config = dict(GRAPH_TENANT_ID='tenant-id', GRAPH_CLIENT_ID='app-id', GRAPH_CLIENT_SECRET='test-secret',
                      INQUIRY_FROM='sender@example.com', INQUIRY_TO='owner@example.com')
        values = server.validate(dict(name='Visitor', email='visitor@example.com',
                                      message='A test project inquiry.'))
        token_response = MagicMock()
        token_response.__enter__.return_value.read.return_value = b'{"access_token":"test-token"}'
        mail_response = MagicMock()
        mail_response.__enter__.return_value.status = 202
        with patch.dict(os.environ, config, clear=True), patch('server.urlopen', side_effect=[token_response, mail_response]) as open_url:
            server.send_inquiry(values)
        token_request, mail_request = [call.args[0] for call in open_url.call_args_list]
        self.assertEqual(token_request.full_url, 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token')
        self.assertEqual(mail_request.full_url, 'https://graph.microsoft.com/v1.0/users/sender%40example.com/sendMail')
        self.assertEqual(mail_request.get_header('Authorization'), 'Bearer test-token')
        body = json.loads(mail_request.data)
        self.assertEqual(body['message']['toRecipients'][0]['emailAddress']['address'], 'owner@example.com')
        self.assertEqual(body['message']['replyTo'][0]['emailAddress']['address'], 'visitor@example.com')
        with patch.dict(os.environ, {'GRAPH_CLIENT_ID': 'app-id'}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'GRAPH_TENANT_ID, GRAPH_CLIENT_SECRET, INQUIRY_FROM, INQUIRY_TO'):
                server.send_inquiry(values)

    def test_endpoint(self):
        app = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        thread = Thread(target=app.serve_forever, daemon=True)
        thread.start()
        payload = dict(name='Visitor', email='visitor@example.com', kind='General inquiry', message='A test project inquiry.')
        def request(data=payload, origin='https://augment-wh.com'):
            conn = HTTPConnection('127.0.0.1', app.server_port)
            conn.request('POST', '/api/inquiry', json.dumps(data), {'Content-Type': 'application/json', 'Origin': origin})
            response = conn.getresponse()
            result = response.status, json.loads(response.read())
            conn.close()
            return result
        try:
            server.attempts.clear()
            for asset in ('header.png', 'logo.png', 'full-logo.png', 'favicon.png', 'manifest.json'):
                conn = HTTPConnection('127.0.0.1', app.server_port)
                conn.request('GET', f'/assets/brand/{asset}')
                response = conn.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(response.read(), (server.PUBLIC / 'assets' / 'brand' / asset).read_bytes())
                conn.close()
            for path in ('/interactions.js',):
                conn = HTTPConnection('127.0.0.1', app.server_port)
                conn.request('GET', path)
                response = conn.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(response.read(), (server.PUBLIC / path.lstrip('/')).read_bytes())
                conn.close()
            for path, expected in (('/presentations/', 200), ('/presentations/novasource', 308), ('/presentations/novasource/', 200), ('/presentations/unknown-company', 404)):
                conn = HTTPConnection('127.0.0.1', app.server_port)
                conn.request('GET', path)
                response = conn.getresponse()
                self.assertEqual(response.status, expected)
                response.read()
                conn.close()
            for path in ('/presentations/companies.json', '/presentations/directory.js', '/presentations/presentation.js', '/presentations/presentation.css'):
                conn = HTTPConnection('127.0.0.1', app.server_port)
                conn.request('GET', path)
                response = conn.getresponse()
                self.assertEqual(response.status, 200)
                response.read()
                conn.close()
            conn = HTTPConnection('127.0.0.1', app.server_port)
            conn.request('GET', '/dev/previous-home/')
            response = conn.getresponse()
            self.assertEqual(response.status, 302)
            self.assertEqual(response.getheader('Location'), '/dev/login/')
            response.read()
            conn.close()
            with patch.object(server, 'is_admin', return_value=True):
                for path, filename in (
                    ('/assets/homepage/homepage.css', 'assets/homepage/homepage.css'),
                    ('/assets/homepage/battery-site-concept.jpeg', 'assets/homepage/battery-site-concept.jpeg'),
                    ('/assets/homepage/degraded-capacity-market.png', 'assets/homepage/degraded-capacity-market.png'),
                    ('/dev/previous-home/', 'dev/previous-home/index.html'),
                    ('/dev', 'dev/index.html'), ('/dev/', 'dev/index.html'),
                    ('/dev/index.html', 'dev/index.html'), ('/dev/styles.css', 'dev/styles.css'),
                    ('/dev/map', 'dev/map/index.html'), ('/dev/map/', 'dev/map/index.html'),
                    ('/dev/deck', 'dev/deck/index.html'), ('/dev/deck/', 'dev/deck/index.html'),
                    ('/dev/field', 'dev/field/index.html'), ('/dev/field/', 'dev/field/index.html'),
                    ('/dev/memo', 'dev/memo/index.html'), ('/dev/memo/', 'dev/memo/index.html'),
                ):
                    conn = HTTPConnection('127.0.0.1', app.server_port)
                    conn.request('GET', path)
                    response = conn.getresponse()
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.read(), (server.PUBLIC / filename).read_bytes())
                    conn.close()
            with tempfile.TemporaryDirectory() as temp:
                public = Path(temp).resolve()
                (public / 'presentations' / 'demo').mkdir(parents=True)
                (public / 'presentations' / 'companies.json').write_text(json.dumps([{'slug': 'demo', 'presentation': 'custom.html'}]))
                (public / 'presentations' / 'demo' / 'custom.html').write_text('<h1>Custom deck</h1>')
                with patch.object(server, 'PUBLIC', public):
                    conn = HTTPConnection('127.0.0.1', app.server_port)
                    conn.request('GET', '/presentations/demo/custom.html')
                    response = conn.getresponse()
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.read(), b'<h1>Custom deck</h1>')
                    conn.close()
            conn = HTTPConnection('127.0.0.1', app.server_port)
            conn.request('GET', '/assets/brand/../../brand.config.json')
            response = conn.getresponse()
            self.assertEqual(response.status, 404)
            response.read()
            conn.close()
            with patch('server.send_inquiry') as send:
                self.assertEqual(request()[0], 200)
                send.assert_called_once()
                self.assertEqual(request(origin='https://elsewhere.example')[0], 403)
                self.assertEqual(request(payload | {'website': 'spam'})[0], 400)
                self.assertEqual(request(payload | {'email': 'invalid'})[0], 400)
            with patch('server.send_inquiry', side_effect=RuntimeError('Unavailable')):
                self.assertEqual(request()[0], 503)
            server.attempts[:] = [server.time.monotonic()] * 20
            self.assertEqual(request()[0], 429)
        finally:
            app.shutdown()
            app.server_close()
            thread.join()
            server.attempts.clear()


if __name__ == '__main__':
    unittest.main()
