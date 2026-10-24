# Static server for local testing that tells browsers not to cache, so edits show up immediately.
import http.server, sys
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
http.server.ThreadingHTTPServer(('0.0.0.0', int(sys.argv[1])), NoCache).serve_forever()
