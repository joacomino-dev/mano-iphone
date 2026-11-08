"""Loopback CONNECT proxy. Logs only normalized host/port/phase/time; never URL
paths, query strings, request headers, payloads or credentials. No TLS interception.
Entry point is restricted to ephemeral hosted Macs by run_with_proxy.py.
"""
import json
import re
import select
import socket
import socketserver
import threading
import time
from urllib.parse import urlsplit

def destination(target,connect):
    parsed=urlsplit(('https://' if connect else '')+target)
    if parsed.scheme not in ['http','https'] or parsed.username is not None or parsed.password is not None: raise ValueError('invalid authority')
    if connect and (parsed.path or parsed.query or parsed.fragment): raise ValueError('invalid CONNECT authority')
    host=(parsed.hostname or '').lower().rstrip('.')
    if not host or len(host)>253 or not re.fullmatch(r'[a-z0-9.-]+',host) or any(not label or len(label)>63 or label.startswith('-') or label.endswith('-') for label in host.split('.')): raise ValueError('invalid host')
    return host,parsed.port or (443 if parsed.scheme=='https' else 80)

class HostProxy(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True
    def __init__(self,address,log_path,phase_path):
        self.log_path,self.phase_path,self.lock=log_path,phase_path,threading.Lock()
        super().__init__(address,Handler)
    def record(self,host,port,method):
        phase=self.phase_path.read_text().strip() if self.phase_path.exists() else 'baseline'
        if phase not in ['calibration','baseline','app-att-allowed','app-att-denied']: phase='unknown'
        record={'timeUnix':time.time(),'host':host,'port':port,'transport':method,'phase':phase}
        with self.lock:
            with self.log_path.open('a') as output: output.write(json.dumps(record)+'\n')
    def handle_error(self,request,client_address): pass # Never log raw request/errors.

class Handler(socketserver.StreamRequestHandler):
    rbufsize=0 # Leave request bodies in the socket for the unrecorded byte tunnel.
    def handle(self):
        remote=None
        try:
            self.connection.settimeout(30)
            line=self.rfile.readline(8193)
            if len(line)>8192: return
            method,target,version=line.decode('ascii').strip().split(' ',2)
            connect=method=='CONNECT'
            host,port=destination(target,connect)
            # SDK traffic is HTTP(S); this is not a general port-forwarding service.
            if port not in [80,443]: raise ValueError('unsupported port')
            headers=[];size=0
            while True:
                header=self.rfile.readline(8193);size+=len(header)
                if size>32768: return
                if header in [b'\r\n',b'\n',b'']: break
                if not header.lower().startswith(b'proxy-authorization:'): headers.append(header)
            self.server.record(host,port,'CONNECT' if connect else 'HTTP')
            remote=socket.create_connection((host,port),timeout=15)
            if connect: self.connection.sendall(b'HTTP/1.1 200 Connection Established\r\n\r\n')
            else:
                parsed=urlsplit(target)
                path=(parsed.path or '/')+('?' +parsed.query if parsed.query else '')
                remote.sendall((method+' '+path+' '+version+'\r\n').encode('ascii')+b''.join(headers)+b'\r\n')
            # No bytes in this tunnel are parsed, printed or retained.
            end=time.monotonic()+180
            while time.monotonic()<end:
                readable,_,_=select.select([self.connection,remote],[],[],2)
                for source in readable:
                    data=source.recv(65536)
                    if not data: return
                    (remote if source is self.connection else self.connection).sendall(data)
        except Exception:
            try: self.connection.sendall(b'HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n')
            except OSError: pass
        finally:
            if remote: remote.close()
