import json
import os
import unittest
from http.client import HTTPConnection
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
