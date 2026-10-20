#!/usr/bin/env python3
"""Read-only production preview. Serves public world assets, never app APIs."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse, mimetypes
ROOT = Path(__file__).resolve().parents[2] / 'public'
class Preview(BaseHTTPRequestHandler):
    def do_GET(self): self.serve(False)
    def do_HEAD(self): self.serve(True)
    def do_POST(self): self.send_error(405, 'Read-only preview')
    do_PUT = do_DELETE = do_PATCH = do_POST
    def serve(self, head):
        path = unquote(urlsplit(self.path).path)
        if path in ('/world-preview', '/world-preview/', '/'):
            path = '/worlds/neighborhood/play.html'
        elif not (path.startswith('/worlds/neighborhood/') or path.startswith('/plaza/') or path == '/worlds/worldgacha/steering.js'):
            self.send_error(404); return
        try:
            file = (ROOT / path.lstrip('/')).resolve()
            if ROOT.resolve() not in file.parents or not file.is_file():
                self.send_error(404); return
            mime = mimetypes.guess_type(str(file))[0] or 'application/octet-stream'
            compressed = Path(str(file) + '.gz')
            gzip = 'gzip' in self.headers.get('Accept-Encoding', '') and compressed.is_file()
            body = (compressed if gzip else file).read_bytes()
        except (OSError, ValueError):
            self.send_error(400); return
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Vary', 'Accept-Encoding')
        if gzip: self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        if not head: self.wfile.write(body)
    def log_message(self, format, *args): pass
if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--port', type=int, default=3054); a = p.parse_args()
    server = ThreadingHTTPServer(('0.0.0.0', a.port), Preview)
    print(f'Read-only Willow preview ready on :{a.port}/world-preview', flush=True)
    server.serve_forever()
