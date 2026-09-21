import http.server, functools

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def guess_type(self, path):
        t = super().guess_type(path)
        if path.endswith('.html') and t == 'text/html':
            return 'text/html; charset=utf-8'
        return t

http.server.ThreadingHTTPServer(('0.0.0.0', 8000),
    functools.partial(NoCacheHandler, directory='.')).serve_forever()
