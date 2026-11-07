import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseAst } from 'rolldown/parseAst';
import { detectLanguage } from '../src/i18n.ts';
import { NATIVE_MESSAGES } from '../src/nativeMessages.ts';
import { PLURALS } from '../src/locales/plurals.ts';
import en from '../src/locales/en.ts';
import fr from '../src/locales/fr.ts';
import ar from '../src/locales/ar.ts';
import ja from '../src/locales/ja.ts';
import de from '../src/locales/de.ts';
import it from '../src/locales/it.ts';
import { ANDROID_TEXT } from '../src/locales/android.ts';

/** Every literal t('…') in the app: the Spanish source text is the key. */
function sourceKeys() {
  const keys = new Set();
  const dir = new URL('../src/', import.meta.url);
  for (const name of fs.readdirSync(dir)) {
    if (!/\.tsx?$/.test(name) || name.endsWith('.d.ts')) continue;
    const code = fs.readFileSync(new URL(name, dir), 'utf8');
    const walk = node => {
      if (!node || typeof node.type !== 'string') return;
      if (node.type === 'CallExpression' && node.callee?.name === 't' && node.arguments?.[0]?.type === 'Literal' && typeof node.arguments[0].value === 'string') keys.add(node.arguments[0].value);
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach(walk);
        else if (value && typeof value === 'object' && typeof value.type === 'string') walk(value);
      }
    };
    const ast = parseAst(code, { lang: name.endsWith('x') ? 'tsx' : 'ts' });
    walk(ast.program ?? ast);
  }
  for (const message of NATIVE_MESSAGES) keys.add(message);
  return keys;
}
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
const tables = { en, fr, de, it, ar, ja };

test('every visible text exists in English, French, German, Italian, Arabic and Japanese, with the same placeholders', () => {
  const keys = sourceKeys();
  assert.ok(keys.size > 350, `found ${keys.size} keys`);
  for (const [lang, table] of Object.entries(tables)) {
    const missing = [...keys].filter(key => !(key in table) || !table[key].trim());
    assert.deepEqual(missing, [], `${lang}: missing translations`);
    const broken = [...keys].filter(key => placeholders(key) !== placeholders(table[key]));
    assert.deepEqual(broken, [], `${lang}: placeholders differ`);
    const lines = [...keys].filter(key => key.includes('\n') && !table[key].includes('\n'));
    assert.deepEqual(lines, [], `${lang}: two-line notices must keep their line break`);
    const stale = Object.keys(table).filter(key => !keys.has(key));
    assert.deepEqual(stale, [], `${lang}: keys no longer used`);
  }
});

test('counted phrases: every language has every key, its «other» form and the same placeholders', () => {
  const keys = Object.keys(PLURALS.es);
  for (const [lang, table] of Object.entries(PLURALS)) {
    assert.deepEqual(Object.keys(table).sort(), [...keys].sort(), lang);
    for (const key of keys) {
      assert.ok(table[key].other, `${lang}.${key}.other`);
      const amount = /\{amount\}/.test(PLURALS.es[key].other);
      for (const [form, text] of Object.entries(table[key])) if (amount) assert.match(text, /\{amount\}/, `${lang}.${key}.${form}`);
    }
  }
});

test('language: a pinned choice wins, then the first supported iPhone language, else English', () => {
  assert.equal(detectLanguage(null, ['fr-CA', 'en-US']), 'fr');
  assert.equal(detectLanguage(null, ['pt-BR', 'ru-RU']), 'en');
  assert.equal(detectLanguage(null, ['pt-BR', 'ar-EG']), 'ar');
  assert.equal(detectLanguage(null, ['ja_JP']), 'ja');
  assert.equal(detectLanguage(null, ['es-419']), 'es');
  assert.equal(detectLanguage('ja', ['es-ES']), 'ja');
  assert.equal(detectLanguage('xx', ['es-ES']), 'es');
  assert.equal(detectLanguage(null, ['de-AT']), 'de');
  assert.equal(detectLanguage(null, ['it-CH', 'en']), 'it');
  assert.equal(detectLanguage(null, []), 'en');
});

test('Android wording replaces existing texts only, in all seven languages, with the same placeholders', () => {
  const keys = sourceKeys();
  for (const [key, text] of Object.entries(ANDROID_TEXT)) {
    assert.ok(keys.has(key), `not an app text: ${key}`);
    for (const language of ['es', 'en', 'fr', 'de', 'it', 'ar', 'ja']) {
      assert.ok(text[language]?.trim(), `${language} missing for ${key}`);
      assert.equal(placeholders(text[language]), placeholders(key), `${language} placeholders for ${key}`);
      assert.doesNotMatch(text[language], /iPhone|iCloud|Recently Deleted|Eliminado recientemente/, `${language} still names iPhone things: ${key}`);
    }
  }
});
