#!/usr/bin/env python3
"""Photos: the Wizard app for photo backup and (later) the owner's photo library.

Stdlib only. Serves the view at /photos/ (private origin, via the private gateway) plus GET /photos/api/health.
The backup itself runs in the Wizard OS Android app; the view reaches it only through the shell relay
(wizard-os:photos postMessage, /photos/ frames only). This server stores nothing and never sees photos or keys.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VERSION = '0.1.0-alpha.1'
STATIC = Path(__file__).resolve().parent / 'static'
PREFIX = '/photos'
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
         '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'}
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; "
       "frame-ancestors 'self'; base-uri 'none'; form-action 'none'")


def resolve(path):
    """Map a request path to a file under static/, or None. Never escapes static/."""
    path = path.split('?', 1)[0].split('#', 1)[0]
    if path == PREFIX:
        return 'redirect'
    if not path.startswith(PREFIX + '/'):
        return None
    rel = path[len(PREFIX) + 1:] or 'index.html'
    f = (STATIC / rel).resolve()
    try:
        f.relative_to(STATIC.resolve())
    except ValueError:
        return None
    return f if f.is_file() else None


class Handler(BaseHTTPRequestHandler):
    server_version = 'wizard-photos'
    sys_version = ''

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype, extra=None):
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?', 1)[0] == PREFIX + '/api/health':
            return self._send(200, json.dumps({'ok': True, 'app': 'photos', 'version': VERSION}).encode(), 'application/json')
        f = resolve(self.path)
        if f == 'redirect':
            self.send_response(308); self.send_header('Location', PREFIX + '/'); self.send_header('Content-Length', '0'); self.end_headers(); return
        if f is None:
            return self._send(404, b'not found', 'text/plain; charset=utf-8')
        return self._send(200, f.read_bytes(), TYPES.get(f.suffix, 'application/octet-stream'), {'Content-Security-Policy': CSP})

    do_HEAD = do_GET


def main():
    host = os.environ.get('PHOTOS_APP_HOST', '127.0.0.1')
    port = int(os.environ.get('PHOTOS_APP_PORT', '9418'))
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == '__main__':
    main()
