import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../app/lib/dashboard-cache.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const cache = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const entries = new Map();
let events = 0;
globalThis.window = {
  sessionStorage: {
    get length() { return entries.size; },
    key: (index) => [...entries.keys()][index] ?? null,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  },
  dispatchEvent: () => { events += 1; },
};

test('cache isolates users and brands and expires after 60 seconds', () => {
  const now = Date.now;
  let clock = 1000;
  Date.now = () => clock;
  try {
    cache.writeDashboardCache(1, 10, { views: 8 }, cache.cacheGeneration());
    assert.deepEqual(cache.readDashboardCache(1, 10), { views: 8 });
    assert.equal(cache.readDashboardCache(2, 10), null);
    assert.equal(cache.readDashboardCache(1, 11), null);
    assert.equal(cache.readDashboardCache(1, null), null);
    clock += cache.DASHBOARD_CACHE_TTL;
    assert.equal(cache.readDashboardCache(1, 10), null);
  } finally { Date.now = now; }
});

test('invalidation removes cached data and rejects an in-flight stale write', () => {
  entries.set('unrelated-setting', 'keep');
  const generation = cache.cacheGeneration();
  cache.writeDashboardCache(1, 10, { views: 8 }, generation);
  cache.invalidateDashboardCache();
  cache.writeDashboardCache(1, 10, { views: 9 }, generation);
  assert.equal(cache.readDashboardCache(1, 10), null);
  assert.equal(entries.get('unrelated-setting'), 'keep');
  assert.equal(events, 1);
  cache.writeDashboardCache(1, 10, { views: 10 }, cache.cacheGeneration());
  assert.deepEqual(cache.readDashboardCache(1, 10), { views: 10 });
});

test('corrupt and unavailable storage degrade to cache misses', () => {
  entries.set('social9_dashboard_cache:1:10', '{broken');
  assert.equal(cache.readDashboardCache(1, 10), null);
  const storage = window.sessionStorage;
  Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('blocked'); } });
  try {
    assert.equal(cache.readDashboardCache(1, 10), null);
    assert.doesNotThrow(() => cache.writeDashboardCache(1, 10, {}, cache.cacheGeneration()));
    assert.doesNotThrow(() => cache.invalidateDashboardCache());
  } finally { Object.defineProperty(window, 'sessionStorage', { configurable: true, value: storage }); }
});
