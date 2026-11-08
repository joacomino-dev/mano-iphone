// Source-only release checks. This does not compile Swift or validate signing.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const read = path => fs.readFileSync(path, 'utf8');
const LANGUAGES = ['es','en','fr','de','it','ar','ja'];
export function checkRelease({ channel, project, info, metadata, icon }) {
  assert.match(channel, /export const DEVELOPER = false;/, 'App Store channel must hide developer controls');
  const release = [...project.matchAll(/\/\* Release \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\};\s*name = Release;/g)]
    .map(m => m[1]).find(text => text.includes('PRODUCT_BUNDLE_IDENTIFIER = work.joaquin.mano;'));
  assert.ok(release, 'App Release configuration missing');
  assert.match(release, /COCO_ADMOB_APP_ID = "ca-app-pub-5676353604168025~4587143429";/);
  assert.match(release, /COCO_ADMOB_NATIVE_UNIT_ID = "ca-app-pub-5676353604168025\/8219266678";/);
  assert.match(release, /TARGETED_DEVICE_FAMILY = 1;/);
  assert.match(release, /IPHONEOS_DEPLOYMENT_TARGET = 17\.0;/);
  assert.doesNotMatch(info, /<key>CocoWash(?:TestAds|DevelopmentReset)<\/key>/, 'Development-only flags must be absent');
  assert.match(info, /<key>GADApplicationIdentifier<\/key>\s*<string>\$\(COCO_ADMOB_APP_ID\)<\/string>/);
  for (const language of LANGUAGES) {
    const text = metadata.localizations[language];
    assert.ok(text, `Missing ${language}`);
    for (const [key, limit] of Object.entries({name:30,subtitle:30,keywords:100,promotionalText:170,description:4000,releaseNotes:4000})) {
      assert.equal(typeof text[key], 'string', `${language}.${key}`);
      assert.ok([...text[key]].length <= limit, `${language}.${key} exceeds ${limit}`);
      assert.ok(text[key].trim().length, `${language}.${key} is empty`);
    }
    assert.doesNotMatch(text.description, /Breakup|recognition|reconocimiento facial|personas agrupadas/i);
    assert.ok(Buffer.byteLength(text.keywords,'utf8') <= 100, `${language}.keywords exceeds 100 UTF-8 bytes`);
    for (const key of ['supportURL','privacyURL']) assert.equal(new URL(text[key]).protocol, 'https:');
  }
  assert.equal(icon.readUInt32BE(16), 1024); assert.equal(icon.readUInt32BE(20), 1024);
  assert.equal(icon[24], 8); assert.equal(icon[25], 2, 'Approved icon must be RGB without alpha');
  return {status:'PASS',boundary:'Static source and metadata only; native build, signatures, SDK report, traffic and distribution remain separate gates',
    marketingVersion:release.match(/MARKETING_VERSION = ([^;]+);/)[1],build:release.match(/CURRENT_PROJECT_VERSION = ([^;]+);/)[1],
    appIconSHA256:crypto.createHash('sha256').update(icon).digest('hex'),metadataLengths:Object.fromEntries(LANGUAGES.map(lang=>[lang,Object.fromEntries(Object.entries(metadata.localizations[lang]).filter(([,v])=>typeof v==='string').map(([k,v])=>[k,[...v].length]))]))};
}
export function inputs() { return {
  channel:read('src/channel.ts'),project:read('ios/App/App.xcodeproj/project.pbxproj'),info:read('ios/App/App/Info.plist'),
  metadata:JSON.parse(read('../docs/apple-readiness/storefront/metadata.json')),
  icon:fs.readFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),
}; }
if (process.argv[1]?.replaceAll('\\','/').endsWith('/check-release.mjs')) console.log(JSON.stringify(checkRelease(inputs()),null,2));
