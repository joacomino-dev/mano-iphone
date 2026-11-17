#!/usr/bin/env python3
"""App Store Connect API for CocoWash 1.0: listing, screenshots, purchases, price,
availability and (only with --submit) the review submission.

Stdlib only; the API token is signed with the system `openssl`. Every step reads the
current state first, so rerunning is safe. Sources of truth stay in the repository:
docs/apple-readiness/storefront/*.json and docs/appstore/in-app-purchases.json.
Never prints the token or the key.
"""
import argparse
import base64
import hashlib
import json
import os
import pathlib
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
API = os.environ.get('ASC_API_BASE', 'https://api.appstoreconnect.apple.com')  # override only in tests
BUNDLE = 'work.joaquin.mano'
MARKETING_URL = 'https://joaquinmino.work/cocowash/'
SCREENS = ['01-cards', '02-review', '03-filters', '04-settings']
SCREEN_SIZES = {(1320, 2868), (1290, 2796), (1260, 2736)}  # 6.9" display slot
EDITABLE = {'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'}
# Age rating: a photo organizer with no such content of its own. Ads (G-rated inventory)
# and purchases exist; no chat, social media, user-generated public content, web browsing or gambling.
AGE_RATING = {
    'alcoholTobaccoOrDrugUseOrReferences': 'NONE', 'contests': 'NONE', 'gamblingSimulated': 'NONE',
    'gunsOrOtherWeapons': 'NONE', 'horrorOrFearThemes': 'NONE', 'matureOrSuggestiveThemes': 'NONE',
    'medicalOrTreatmentInformation': 'NONE', 'profanityOrCrudeHumor': 'NONE',
    'sexualContentGraphicAndNudity': 'NONE', 'sexualContentOrNudity': 'NONE',
    'violenceCartoonOrFantasy': 'NONE', 'violenceRealistic': 'NONE',
    'violenceRealisticProlongedGraphicOrSadistic': 'NONE',
    'gambling': False, 'lootBox': False, 'unrestrictedWebAccess': False, 'messagingAndChat': False,
    'userGeneratedContent': False, 'advertising': True, 'parentalControls': False,
    'ageAssurance': False, 'healthOrWellnessTopics': False, 'socialMedia': False,
}


def log(*parts):
    print(*parts, flush=True)


class APIError(Exception):
    def __init__(self, status, method, path, body):
        super().__init__(f'{method} {path} -> HTTP {status}: {body[:1500]}')
        self.status = status
        try:
            self.errors = json.loads(body).get('errors', [])
        except ValueError:
            self.errors = []

    def bad_attributes(self):
        """Attributes Apple does not know or does not allow here. Invalid or missing values are real errors."""
        names = []
        for error in self.errors:
            pointer = (error.get('source') or {}).get('pointer', '')
            code = error.get('code', '')
            if pointer.startswith('/data/attributes/') and any(k in code for k in ('UNKNOWN', 'NOT_ALLOWED', 'NOT_EDITABLE')):
                names.append(pointer.rsplit('/', 1)[-1])
        return names


def b64url(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b'=').decode()


def der_to_raw(der):
    """ECDSA DER signature -> JOSE r||s (32 bytes each)."""
    assert der[0] == 0x30
    i = 2 if der[1] < 0x80 else 3
    out = b''
    for _ in range(2):
        assert der[i] == 0x02
        length = der[i + 1]
        value = der[i + 2:i + 2 + length].lstrip(b'\0')
        out += value.rjust(32, b'\0')
        i += 2 + length
    return out


class ASC:
    def __init__(self, key_id, issuer, key_path):
        self.key_id, self.issuer, self.key_path = key_id, issuer, key_path
        self._token, self._expires = None, 0

    def token(self):
        now = int(time.time())
        if self._token and now < self._expires - 60:
            return self._token
        header = b64url(json.dumps({'alg': 'ES256', 'kid': self.key_id, 'typ': 'JWT'}).encode())
        payload = b64url(json.dumps({'iss': self.issuer, 'iat': now - 30, 'exp': now + 900,
                                     'aud': 'appstoreconnect-v1'}).encode())
        signing_input = f'{header}.{payload}'.encode()
        der = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', self.key_path], input=signing_input,
                             capture_output=True, check=True).stdout
        self._token = f'{header}.{payload}.{b64url(der_to_raw(der))}'
        self._expires = now + 900
        return self._token

    def call(self, method, path, body=None):
        url = path if path.startswith('http') else API + path
        data = json.dumps(body).encode() if body is not None else None
        for attempt in range(7):
            request = urllib.request.Request(url, data=data, method=method, headers={
                'Authorization': 'Bearer ' + self.token(), 'Content-Type': 'application/json'})
            try:
                with urllib.request.urlopen(request, timeout=120) as response:
                    raw = response.read()
                    return json.loads(raw) if raw else {}
            except urllib.error.HTTPError as error:
                text = error.read().decode('utf-8', 'replace')
                if error.code in (429, 500, 502, 503, 504) and attempt < 6:
                    time.sleep(5 * (attempt + 1))
                    continue
                if error.code == 401 and attempt < 6:
                    # Apple occasionally rejects a valid token for a while mid-run; sign a fresh one and back off.
                    self._token = None
                    log(f'  · Apple returned 401; new token, retry {attempt + 1}/6')
                    time.sleep(10 * (attempt + 1))
                    continue
                raise APIError(error.code, method, path.split('?')[0], text) from None
        raise RuntimeError('unreachable')

    def get(self, path, **params):
        query = ('?' + urllib.parse.urlencode(params)) if params else ''
        return self.call('GET', path + query)

    def get_all(self, path, **params):
        params.setdefault('limit', 200)
        page = self.get(path, **params)
        items = list(page.get('data') or [])
        while (page.get('links') or {}).get('next'):
            page = self.call('GET', page['links']['next'])
            items += page.get('data') or []
        return items

    def get_optional(self, path):
        try:
            return self.get(path).get('data')
        except APIError as error:
            if error.status == 404:
                return None
            raise

    def send(self, method, path, kind, attributes=None, relationships=None, ident=None, included=None):
        """POST/PATCH; drops attributes Apple reports as unknown/not allowed and retries."""
        attributes = dict(attributes or {})
        while True:
            data = {'type': kind}
            if ident:
                data['id'] = ident
            if attributes:
                data['attributes'] = attributes
            if relationships:
                data['relationships'] = relationships
            body = {'data': data}
            if included:
                body['included'] = included
            try:
                return self.call(method, path, body).get('data')
            except APIError as error:
                dropped = [name for name in error.bad_attributes() if name in attributes]
                if error.status not in (400, 409, 422) or not dropped:
                    raise
                for name in dropped:
                    detail = next((e.get('detail', '') for e in error.errors
                                   if (e.get('source') or {}).get('pointer', '').endswith('/' + name)), '')
                    log(f'  · Apple does not accept attribute {name} here ({detail}); continuing without it')
                    attributes.pop(name)


def rel(kind, ident):
    return {'data': {'type': kind, 'id': ident}}


def load_sources():
    store = json.loads((ROOT / 'docs/apple-readiness/storefront/metadata.json').read_text(encoding='utf-8'))
    review = json.loads((ROOT / 'docs/apple-readiness/storefront/review-localizations.json').read_text(encoding='utf-8'))
    iap = json.loads((ROOT / 'docs/appstore/in-app-purchases.json').read_text(encoding='utf-8'))
    listing = {}
    for lang, codes in store['localeMapping'].items():
        listing[codes['apple']] = dict(store['localizations'][lang], lang=lang)
    return store, review, iap, listing


def find_app(asc):
    apps = asc.get('/v1/apps', **{'filter[bundleId]': BUNDLE}).get('data') or []
    if not apps:
        sys.exit(f'No app with bundle {BUNDLE} in App Store Connect')
    return apps[0]


def find_version(asc, app_id, version):
    versions = asc.get_all(f'/v1/apps/{app_id}/appStoreVersions', **{'filter[platform]': 'IOS'})
    for item in versions:
        if item['attributes']['versionString'] == version:
            state = item['attributes'].get('appStoreState') or item['attributes'].get('appVersionState')
            log(f'Version {version}: {state}')
            if state not in EDITABLE:
                sys.exit(f'Version {version} is not editable ({state})')
            return item
    sys.exit(f'Version {version} not found; existing: {[v["attributes"]["versionString"] for v in versions]}')


def localized(listing, primary_locale):
    """Our Apple locales, plus the app's primary locale if it is another variant of one of ours."""
    out = dict(listing)
    if primary_locale not in out:
        base = primary_locale.split('-')[0]
        match = next((code for code in listing if code.split('-')[0] == base), None)
        if match:
            out[primary_locale] = listing[match]
    return out


def step_metadata(asc, app, version, release_type, sources):
    store, review, iap, listing = sources
    locales = localized(listing, app['attributes']['primaryLocale'])
    log(f'\n== Listing ({len(locales)} locales, primary {app["attributes"]["primaryLocale"]})')
    asc.send('PATCH', f'/v1/appStoreVersions/{version["id"]}', 'appStoreVersions', ident=version['id'],
             attributes={'copyright': store['copyright'], 'releaseType': release_type})
    log(f'  copyright and release type {release_type}')
    # Ads show third-party content, licensed through the AdMob terms.
    asc.send('PATCH', f'/v1/apps/{app["id"]}', 'apps', ident=app['id'],
             attributes={'contentRightsDeclaration': 'USES_THIRD_PARTY_CONTENT'})
    log('  content rights: third-party content (ads) with the necessary rights')

    infos = asc.get_all(f'/v1/apps/{app["id"]}/appInfos')
    info = next((i for i in infos if (i['attributes'].get('appStoreState') or i['attributes'].get('state')) != 'READY_FOR_SALE'), infos[0])
    asc.send('PATCH', f'/v1/appInfos/{info["id"]}', 'appInfos', ident=info['id'], relationships={
        'primaryCategory': rel('appCategories', store['primaryCategory']),
        'secondaryCategory': rel('appCategories', store['secondaryCategory'])})
    log(f'  categories {store["primaryCategory"]} / {store["secondaryCategory"]}')

    existing = {i['attributes']['locale']: i for i in asc.get_all(f'/v1/appInfos/{info["id"]}/appInfoLocalizations')}
    for locale, text in locales.items():
        attributes = {'name': text['name'], 'subtitle': text['subtitle'], 'privacyPolicyUrl': text['privacyURL']}
        if locale in existing:
            asc.send('PATCH', f'/v1/appInfoLocalizations/{existing[locale]["id"]}', 'appInfoLocalizations',
                     ident=existing[locale]['id'], attributes=attributes)
        else:
            asc.send('POST', '/v1/appInfoLocalizations', 'appInfoLocalizations', attributes=dict(attributes, locale=locale),
                     relationships={'appInfo': rel('appInfos', info['id'])})
        log(f'  app info {locale}: name, subtitle, privacy URL')

    existing = {i['attributes']['locale']: i for i in asc.get_all(f'/v1/appStoreVersions/{version["id"]}/appStoreVersionLocalizations')}
    for locale, text in locales.items():
        attributes = {'description': text['description'], 'keywords': text['keywords'],
                      'promotionalText': text['promotionalText'], 'supportUrl': text['supportURL'],
                      'marketingUrl': MARKETING_URL}
        if locale in existing:
            asc.send('PATCH', f'/v1/appStoreVersionLocalizations/{existing[locale]["id"]}', 'appStoreVersionLocalizations',
                     ident=existing[locale]['id'], attributes=attributes)
        else:
            asc.send('POST', '/v1/appStoreVersionLocalizations', 'appStoreVersionLocalizations',
                     attributes=dict(attributes, locale=locale), relationships={'appStoreVersion': rel('appStoreVersions', version['id'])})
        log(f'  version {locale}: description, keywords, promotional text, URLs')

    declaration = asc.get_optional(f'/v1/appInfos/{info["id"]}/ageRatingDeclaration')
    if declaration:
        asc.send('PATCH', f'/v1/ageRatingDeclarations/{declaration["id"]}', 'ageRatingDeclarations',
                 ident=declaration['id'], attributes=AGE_RATING)
        log('  age rating questionnaire: no objectionable content, ads yes, no chat/UGC/web/gambling')

    responsible = review['responsible'].split(' ', 1)
    notes = review['localizations']['en']['reviewNotes'] + '\n\nIn-app purchases: ' + iap['reviewNote']
    attributes = {'contactFirstName': responsible[0], 'contactLastName': responsible[-1],
                  'contactEmail': review['contact'], 'demoAccountRequired': False, 'notes': notes[:4000]}
    if os.environ.get('ASC_REVIEW_PHONE'):
        attributes['contactPhone'] = os.environ['ASC_REVIEW_PHONE']
    detail = asc.get_optional(f'/v1/appStoreVersions/{version["id"]}/appStoreReviewDetail')
    if detail:
        asc.send('PATCH', f'/v1/appStoreReviewDetails/{detail["id"]}', 'appStoreReviewDetails', ident=detail['id'], attributes=attributes)
    elif 'contactPhone' in attributes:
        asc.send('POST', '/v1/appStoreReviewDetails', 'appStoreReviewDetails', attributes=attributes,
                 relationships={'appStoreVersion': rel('appStoreVersions', version['id'])})
    else:
        log('  review contact SKIPPED: Apple requires a phone (+country code); set the ASC_REVIEW_PHONE secret')
        return
    log('  review contact and notes')


def png_size(path):
    data = path.read_bytes()[:26]
    assert data[:8] == b'\x89PNG\r\n\x1a\n', f'{path.name} is not a PNG'
    return struct.unpack('>II', data[16:24])


def upload_asset(asc, create_path, kind, relationship, path):
    raw = path.read_bytes()
    asset = asc.send('POST', create_path, kind, attributes={'fileName': path.name, 'fileSize': len(raw)},
                     relationships=relationship)
    for op in asset['attributes']['uploadOperations']:
        chunk = raw[op['offset']:op['offset'] + op['length']]
        headers = {h['name']: h['value'] for h in op.get('requestHeaders') or []}
        request = urllib.request.Request(op['url'], data=chunk, method=op['method'], headers=headers)
        with urllib.request.urlopen(request, timeout=300):
            pass
    asc.send('PATCH', f'{create_path}/{asset["id"]}', kind, ident=asset['id'],
             attributes={'uploaded': True, 'sourceFileChecksum': hashlib.md5(raw).hexdigest()})
    return asset['id']


def step_screenshots(asc, app, version, folder, display, sources):
    listing = sources[3]
    locales = localized(listing, app['attributes']['primaryLocale'])
    folder = pathlib.Path(folder)
    log(f'\n== Screenshots {display} from {folder}')
    for locale, text in locales.items():
        files = [folder / f'{text["lang"]}-{screen}.png' for screen in SCREENS]
        for path in files:
            size = png_size(path)
            if size not in SCREEN_SIZES:
                sys.exit(f'{path.name} is {size[0]}x{size[1]}; the 6.9" slot needs one of {sorted(SCREEN_SIZES)}')
    localizations = {i['attributes']['locale']: i for i in asc.get_all(f'/v1/appStoreVersions/{version["id"]}/appStoreVersionLocalizations')}
    for locale, text in locales.items():
        loc = localizations.get(locale)
        if not loc:
            sys.exit(f'No version localization {locale}; run the listing step first')
        sets = asc.get_all(f'/v1/appStoreVersionLocalizations/{loc["id"]}/appScreenshotSets')
        target = next((s for s in sets if s['attributes']['screenshotDisplayType'] == display), None)
        if not target:
            target = asc.send('POST', '/v1/appScreenshotSets', 'appScreenshotSets', attributes={'screenshotDisplayType': display},
                              relationships={'appStoreVersionLocalization': rel('appStoreVersionLocalizations', loc['id'])})
        for old in asc.get_all(f'/v1/appScreenshotSets/{target["id"]}/appScreenshots'):
            asc.call('DELETE', f'/v1/appScreenshots/{old["id"]}')
        for screen in SCREENS:
            upload_asset(asc, '/v1/appScreenshots', 'appScreenshots',
                         {'appScreenshotSet': rel('appScreenshotSets', target['id'])}, folder / f'{text["lang"]}-{screen}.png')
        log(f'  {locale}: {len(SCREENS)} screenshots')


def territories(asc):
    return [t['id'] for t in asc.get_all('/v1/territories')]


def step_price_and_availability(asc, app, excluded):
    log('\n== Price (free) and availability')
    points = asc.get_all(f'/v1/apps/{app["id"]}/appPricePoints', **{'filter[territory]': 'USA'})
    free = next(p for p in points if float(p['attributes']['customerPrice']) == 0)
    try:
        asc.send('POST', '/v1/appPriceSchedules', 'appPriceSchedules', relationships={
            'app': rel('apps', app['id']), 'baseTerritory': rel('territories', 'USA'),
            'manualPrices': {'data': [{'type': 'appPrices', 'id': '${free}'}]}},
            included=[{'type': 'appPrices', 'id': '${free}', 'attributes': {'startDate': None},
                       'relationships': {'appPricePoint': rel('appPricePoints', free['id'])}}])
        log('  price: free')
    except APIError as error:
        log(f'  price not changed: {error}')
    ids = [t for t in territories(asc) if t not in excluded]
    try:
        asc.send('POST', '/v2/appAvailabilities', 'appAvailabilities', attributes={'availableInNewTerritories': True},
                 relationships={'app': rel('apps', app['id']), 'territoryAvailabilities': {
                     'data': [{'type': 'territoryAvailabilities', 'id': f'${{{t}}}'} for t in ids]}},
                 included=[{'type': 'territoryAvailabilities', 'id': f'${{{t}}}', 'attributes': {'available': True},
                            'relationships': {'territory': rel('territories', t)}} for t in ids])
        log(f'  available in {len(ids)} territories (excluded: {", ".join(sorted(excluded)) or "none"})')
    except APIError as error:
        log(f'  availability not changed: {error}')


def step_purchases(asc, app, prices, review_screenshot, sources, excluded):
    iap = sources[2]
    log('\n== In-app purchases')
    all_territories = [t for t in territories(asc) if t not in excluded]
    for product in iap['products']:
        pid = product['productId']
        found = asc.get(f'/v1/apps/{app["id"]}/inAppPurchasesV2', **{'filter[productId]': pid}).get('data') or []
        if found:
            item = found[0]
            log(f'  {pid}: exists ({item["attributes"].get("state")})')
        else:
            attributes = {'name': product['referenceName'], 'productId': pid, 'inAppPurchaseType': product['type'],
                          'reviewNote': iap['reviewNote']}
            if product['type'] != 'CONSUMABLE':
                attributes['familySharable'] = False
            item = asc.send('POST', '/v2/inAppPurchases', 'inAppPurchases', attributes=attributes,
                            relationships={'app': rel('apps', app['id'])})
            log(f'  {pid}: created ({product["type"]})')
        ident = item['id']
        existing = {i['attributes']['locale']: i for i in asc.get_all(f'/v2/inAppPurchases/{ident}/inAppPurchaseLocalizations')}
        for locale, text in product['localizations'].items():
            if locale in existing:
                asc.send('PATCH', f'/v1/inAppPurchaseLocalizations/{existing[locale]["id"]}', 'inAppPurchaseLocalizations',
                         ident=existing[locale]['id'], attributes=text)
            else:
                asc.send('POST', '/v1/inAppPurchaseLocalizations', 'inAppPurchaseLocalizations', attributes=dict(text, locale=locale),
                         relationships={'inAppPurchaseV2': rel('inAppPurchases', ident)})
        log(f'    {len(product["localizations"])} localizations')
        price = prices.get(pid)
        if price:
            points = asc.get_all(f'/v2/inAppPurchases/{ident}/pricePoints', **{'filter[territory]': 'USA'})
            point = next((p for p in points if abs(float(p['attributes']['customerPrice']) - float(price)) < 0.005), None)
            if not point:
                sys.exit(f'No USD price point {price} for {pid}; nearest: '
                         f'{sorted({p["attributes"]["customerPrice"] for p in points}, key=lambda v: abs(float(v) - float(price)))[:5]}')
            try:
                asc.send('POST', '/v1/inAppPurchasePriceSchedules', 'inAppPurchasePriceSchedules', relationships={
                    'inAppPurchase': rel('inAppPurchases', ident), 'baseTerritory': rel('territories', 'USA'),
                    'manualPrices': {'data': [{'type': 'inAppPurchasePrices', 'id': '${price}'}]}},
                    included=[{'type': 'inAppPurchasePrices', 'id': '${price}', 'attributes': {'startDate': None},
                               'relationships': {'inAppPurchasePricePoint': rel('inAppPurchasePricePoints', point['id'])}}])
                log(f'    price USD {price} (other countries follow Apple equalization)')
            except APIError as error:
                log(f'    price not changed: {error}')
        if not asc.get_optional(f'/v2/inAppPurchases/{ident}/inAppPurchaseAvailability'):
            asc.send('POST', '/v1/inAppPurchaseAvailabilities', 'inAppPurchaseAvailabilities',
                     attributes={'availableInNewTerritories': True}, relationships={
                         'inAppPurchase': rel('inAppPurchases', ident),
                         'availableTerritories': {'data': [{'type': 'territories', 'id': t} for t in all_territories]}})
            log(f'    available in {len(all_territories)} territories')
        if review_screenshot and not asc.get_optional(f'/v2/inAppPurchases/{ident}/appStoreReviewScreenshot'):
            upload_asset(asc, '/v1/inAppPurchaseAppStoreReviewScreenshots', 'inAppPurchaseAppStoreReviewScreenshots',
                         {'inAppPurchaseV2': rel('inAppPurchases', ident)}, pathlib.Path(review_screenshot))
            log('    review screenshot uploaded')


def step_submit(asc, app, version, version_string, build_number):
    log('\n== Build and review submission')
    builds = asc.get('/v1/builds', **{'filter[app]': app['id'], 'filter[version]': build_number,
                                      'filter[preReleaseVersion.version]': version_string}).get('data') or []
    if not builds:
        sys.exit(f'Build {version_string} ({build_number}) not found yet; wait for processing and rerun')
    build = builds[0]
    if build['attributes'].get('processingState') != 'VALID':
        sys.exit(f'Build {build_number} is {build["attributes"].get("processingState")}; rerun when VALID')
    asc.call('PATCH', f'/v1/appStoreVersions/{version["id"]}/relationships/build', {'data': {'type': 'builds', 'id': build['id']}})
    log(f'  build {version_string} ({build_number}) attached')
    for item in asc.get_all(f'/v1/apps/{app["id"]}/inAppPurchasesV2'):
        if item['attributes'].get('state') == 'READY_TO_SUBMIT':
            asc.send('POST', '/v1/inAppPurchaseSubmissions', 'inAppPurchaseSubmissions',
                     relationships={'inAppPurchaseV2': rel('inAppPurchases', item['id'])})
            log(f'  {item["attributes"]["productId"]}: submitted with this version')
    open_submissions = asc.get_all('/v1/reviewSubmissions', **{'filter[app]': app['id'], 'filter[platform]': 'IOS',
                                                               'filter[state]': 'READY_FOR_REVIEW'})
    submission = open_submissions[0] if open_submissions else asc.send(
        'POST', '/v1/reviewSubmissions', 'reviewSubmissions', attributes={'platform': 'IOS'},
        relationships={'app': rel('apps', app['id'])})
    try:
        asc.send('POST', '/v1/reviewSubmissionItems', 'reviewSubmissionItems', relationships={
            'reviewSubmission': rel('reviewSubmissions', submission['id']),
            'appStoreVersion': rel('appStoreVersions', version['id'])})
    except APIError as error:
        if error.status != 409:
            raise
        log(f'  version already in the submission or blocked: {error}')
    asc.send('PATCH', f'/v1/reviewSubmissions/{submission["id"]}', 'reviewSubmissions', ident=submission['id'],
             attributes={'submitted': True})
    log('  SUBMITTED FOR REVIEW')


def step_status(asc, app, version):
    log('\n== Status')
    v = asc.get(f'/v1/appStoreVersions/{version["id"]}', include='build').get('data')
    log(f'  version state: {v["attributes"].get("appStoreState")}, release: {v["attributes"].get("releaseType")}')
    build = asc.get_optional(f'/v1/appStoreVersions/{version["id"]}/build')
    log(f'  build: {build["attributes"]["version"] if build else "none attached"}')
    for loc in asc.get_all(f'/v1/appStoreVersions/{version["id"]}/appStoreVersionLocalizations'):
        count = sum(len(asc.get_all(f'/v1/appScreenshotSets/{s["id"]}/appScreenshots'))
                    for s in asc.get_all(f'/v1/appStoreVersionLocalizations/{loc["id"]}/appScreenshotSets'))
        log(f'  {loc["attributes"]["locale"]}: description {"yes" if loc["attributes"].get("description") else "NO"}, screenshots {count}')
    for item in asc.get_all(f'/v1/apps/{app["id"]}/inAppPurchasesV2'):
        log(f'  IAP {item["attributes"]["productId"]}: {item["attributes"].get("state")}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', default='1.0')
    parser.add_argument('--steps', default='metadata,screenshots,price,purchases,status',
                        help='comma list: metadata, screenshots, price, purchases, submit, status')
    parser.add_argument('--screens', help='folder with <lang>-<screen>.png')
    parser.add_argument('--display', default='APP_IPHONE_67', help='screenshot display type of the 6.9" slot')
    parser.add_argument('--release-type', default='AFTER_APPROVAL', choices=['AFTER_APPROVAL', 'MANUAL'])
    parser.add_argument('--exclude-territories', default='CHN', help='China requires an ICP number')
    parser.add_argument('--price-year')
    parser.add_argument('--price-lifetime')
    parser.add_argument('--price-coffee')
    parser.add_argument('--build')
    args = parser.parse_args()
    asc = ASC(os.environ['ASC_KEY_ID'], os.environ['ASC_ISSUER_ID'], os.environ['ASC_KEY_PATH'])
    sources = load_sources()
    steps = [s.strip() for s in args.steps.split(',') if s.strip()]
    excluded = {t.strip() for t in args.exclude_territories.split(',') if t.strip()}
    app = find_app(asc)
    log(f'App {app["attributes"]["name"]} ({BUNDLE}), primary locale {app["attributes"]["primaryLocale"]}')
    version = find_version(asc, app['id'], args.version)
    if 'metadata' in steps:
        step_metadata(asc, app, version, args.release_type, sources)
    if 'screenshots' in steps:
        step_screenshots(asc, app, version, args.screens, args.display, sources)
    if 'price' in steps:
        step_price_and_availability(asc, app, excluded)
    if 'purchases' in steps:
        prices = {'work.joaquin.mano.noads.year': args.price_year, 'work.joaquin.mano.noads.lifetime': args.price_lifetime,
                  'work.joaquin.mano.coffee': args.price_coffee}
        review_shot = pathlib.Path(args.screens) / 'es-04-settings.png' if args.screens else None
        step_purchases(asc, app, prices, review_shot if review_shot and review_shot.exists() else None, sources, excluded)
    if 'submit' in steps:
        if not args.build:
            sys.exit('--build is required to submit')
        step_submit(asc, app, version, args.version, args.build)
    if 'status' in steps:
        step_status(asc, app, version)


if __name__ == '__main__':
    main()
