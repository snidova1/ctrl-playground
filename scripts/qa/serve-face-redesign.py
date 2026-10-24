from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[2]
BUNDLE=Path('/tmp/ctrl-face-redesign')
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  p=urlsplit(path).path
  if p.startswith('/plaza/'):return str(ROOT/'public'/p.lstrip('/'))
  if p=='/':return str(BUNDLE/'index.html')
  return str(BUNDLE/p.lstrip('/'))
 def log_message(self,*args):pass
print('FACE_PREVIEW_READY http://127.0.0.1:3198',flush=True)
ThreadingHTTPServer(('127.0.0.1',3198),Handler).serve_forever()
