from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory='/tmp/ctrl-furniture-preview',**kwargs)
 def do_GET(self):
  if urlsplit(self.path).path in ['/','/habitat-test']:self.path='/index.html'
  return super().do_GET()
 def log_message(self,*args):pass
print('FURNITURE_SOURCE_READY http://127.0.0.1:3242',flush=True)
ThreadingHTTPServer(('127.0.0.1',3242),Handler).serve_forever()
