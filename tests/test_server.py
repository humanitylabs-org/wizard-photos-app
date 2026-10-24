import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'app'))
import server  # noqa: E402


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.base = 'http://127.0.0.1:%d' % cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()

    def get(self, path):
        try:
            r = urllib.request.urlopen(self.base + path)
            return r.status, r.headers, r.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()

    def test_view_health_and_csp(self):
        code, h, body = self.get('/photos/')
        self.assertEqual(code, 200)
        self.assertIn(b'photos.js', body)
        self.assertIn("frame-ancestors 'self'", h['Content-Security-Policy'])
        code, _, body = self.get('/photos/api/health')
        self.assertEqual((code, json.loads(body)['app']), (200, 'photos'))

    def test_no_escape_from_static(self):
        for p in ('/photos/../server.py', '/photos/%2e%2e/server.py', '/server.py', '/photos/nope.js'):
            self.assertEqual(self.get(p)[0], 404, p)


if __name__ == '__main__':
    unittest.main()
