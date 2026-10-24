"""Serve the isolated entry preview assets with the same entry route as its worker."""
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=3251)
parser.add_argument('--directory', default='/tmp/ctrl-entry-art-preview/public')
args = parser.parse_args()

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=args.directory, **kw)
    def do_GET(self):
        if urlsplit(self.path).path in ('/', '/habitat-test'):
            self.path = '/index.html'
        super().do_GET()

ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
