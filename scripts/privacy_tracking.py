"""Manifest declaration validation, not a runtime privacy certification."""
import re

def validate_tracking(manifest,approved):
    domains=manifest.get('NSPrivacyTrackingDomains',[])
    if not isinstance(domains,list) or any(not isinstance(d,str) or not re.fullmatch(r'(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}',d) for d in domains):
        raise ValueError('Tracking domains must be exact lowercase DNS names, without URL/path/wildcard')
    if len(set(domains))!=len(domains): raise ValueError('Duplicate tracking domains')
    if manifest.get('NSPrivacyTracking') and not domains: raise ValueError('Tracking enabled with no domains')
    if domains and manifest.get('NSPrivacyTracking') is not True: raise ValueError('Domains require tracking=true')
    if set(domains)!=set(approved): raise ValueError('Manifest domains differ from explicit owner approval')
    return True
