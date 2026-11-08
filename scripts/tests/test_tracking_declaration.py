import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('tracking',Path(__file__).parents[1]/'privacy_tracking.py')
tracking=importlib.util.module_from_spec(spec);spec.loader.exec_module(tracking)

class TrackingDeclarationTests(unittest.TestCase):
    def test_approved_exact_domains(self):
        self.assertTrue(tracking.validate_tracking({'NSPrivacyTracking':True,'NSPrivacyTrackingDomains':['a.example.com']},['a.example.com']))
    def test_tracking_without_domains(self):
        with self.assertRaises(ValueError):tracking.validate_tracking({'NSPrivacyTracking':True,'NSPrivacyTrackingDomains':[]},[])
    def test_unapproved_or_missing(self):
        for hosts in [['a.example.com','b.example.com'],[]]:
            with self.assertRaises(ValueError):tracking.validate_tracking({'NSPrivacyTracking':True,'NSPrivacyTrackingDomains':hosts},['a.example.com'])
    def test_invalid_dns_and_duplicate(self):
        for hosts in [['https://a.example.com'],['*.example.com'],['a.example.com/x'],['a.example.com','a.example.com'],['a..com']]:
            with self.assertRaises(ValueError):tracking.validate_tracking({'NSPrivacyTracking':True,'NSPrivacyTrackingDomains':hosts},hosts)
    def test_false_tracking_with_domains(self):
        with self.assertRaises(ValueError):tracking.validate_tracking({'NSPrivacyTracking':False,'NSPrivacyTrackingDomains':['a.example.com']},['a.example.com'])

if __name__=='__main__':unittest.main()
