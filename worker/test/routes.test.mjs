// worker/routes.js: which folder each address serves, and what it must never serve. Run: node --test 'worker/test/*.test.mjs'
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolve, SITES } from '../routes.js';

test('the root host serves the eeg folder', () => {
  assert.deepEqual(resolve('eeg.anantf.com', '/'), { file: 'eeg/' });
  assert.deepEqual(resolve('eeg.anantf.com', '/app.js'), { file: 'eeg/app.js' });
  assert.deepEqual(resolve('EEG.anantf.com:443', '/'), { file: 'eeg/' });
  assert.deepEqual(resolve('eeg.anantf.com', '/eeg'), { redirect: '/eeg/' });
  assert.deepEqual(resolve('eeg.anantf.com', '/eeg/index.html'), { file: 'eeg/index.html' });
});

test('/bis/ forwards through its own folder', () => {
  assert.deepEqual(resolve('eeg.anantf.com', '/bis/'), { file: 'bis/' });
});

test('unknown hosts serve nothing; localhost serves the repo', () => {
  assert.deepEqual(resolve('x.workers.dev', '/eeg/'), { notFound: true });
  assert.deepEqual(resolve('other.anantf.com', '/'), { notFound: true });
  assert.deepEqual(resolve('localhost:8787', '/eeg/'), { file: 'eeg/' });
});

test('nothing escapes its folder', () => {
  for (const p of ['/../wrangler.jsonc', '/%2e%2e/x', '/a%2fb', '/a\\b', '/./x'])
    assert.deepEqual(resolve('eeg.anantf.com', p), { notFound: true }, p);
});

test('tools, worker and notes are not reachable by address', () => {
  for (const p of ['/tools/check.mjs', '/worker/routes.js', '/wrangler.jsonc'])
    assert.notDeepEqual(resolve('eeg.anantf.com', p), { file: p.slice(1) }, p);
});

test('every folder in SITES exists', () => {
  for (const [host, s] of Object.entries(SITES))
    for (const f of [s.root, ...Object.values(s.prefixes || {})].filter(Boolean))
      assert.ok(fs.existsSync(new URL(`../../${f}`, import.meta.url)), `${host}: ${f}`);
});
