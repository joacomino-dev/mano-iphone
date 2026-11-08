import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('proxy',Path(__file__).parents[1]/'privacy-hosts/host_proxy.py');proxy=importlib.util.module_from_spec(spec);spec.loader.exec_module(proxy)
class HostParserTests(unittest.TestCase):
    def test_connect(self): self.assertEqual(proxy.destination('Example.COM:443',True),('example.com',443))
    def test_http_paths_discarded(self): self.assertEqual(proxy.destination('http://example.com/private?token=never-log',False),('example.com',80))
    def test_credentials_refused(self):
        with self.assertRaises(ValueError): proxy.destination('https://user:secret@example.com/',False)
    def test_bad_connect(self):
        for value in ['example.com/private','example.com?secret=value','example.com:bad','bad_host:443','a..com:443']:
            with self.assertRaises(ValueError): proxy.destination(value,True)

if __name__=='__main__': unittest.main()
