import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

let network = 'mainnet';
let chain = 'SatoshiNet';
let lastUrl;
const state = () => ({ network, chain, connected: false });
const store = { getState: state };
const env = {
  NEXT_PUBLIC_ORDX_HOST: 'https://indexer.example',
  NEXT_PUBLIC_SATESTNET_HOST: 'https://snet.example',
  NEXT_PUBLIC_BITCOIN_MARKET_URL: 'http://127.0.0.1:3001/market/',
  NEXT_PUBLIC_REGTEST_L1_INDEXER_URL: 'http://127.0.0.1:31643/btc/regtest',
  NEXT_PUBLIC_REGTEST_L2_INDEXER_URL: 'http://127.0.0.1:31662/regtest',
  NEXT_PUBLIC_REGTEST_STP_URL: 'http://127.0.0.1:31663/regtest',
};
const page = { location: { href: 'http://127.0.0.1:3006/?network=regtest', search: '?network=regtest', hostname: '127.0.0.1' } };
async function load(file, transform = x => x, globals = {}) {
  const source = transform(await readFile(new URL(`../../${file}`, import.meta.url), 'utf8'));
  const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, process: { env }, console, window: page, location: page.location,
    URL, URLSearchParams, Headers, AbortController, setTimeout, clearTimeout,
    fetch: async url => { lastUrl = url; return { ok: true, json: async () => ({code: 0, data: []}) }; },
    require: () => ({ getConfiguredNetwork: () => network, useCommonStore: store, useReactWalletStore: store, removeObjectEmptyValue: x => x }),
    ...globals,
  }, { filename: file });
  return exports;
}
const client = (await load('api/clientApi.ts')).default;
const market = await load('api/market.ts');
const urls = await load('store/common.ts', x => x.slice(0, x.indexOf('interface CommonState')));
const navigation = await load('components/ChainSelect.tsx', x => `${x}\nexport { resolveBitcoinMarketUrl };`);
const require = createRequire(import.meta.url);
const middleware = require('zustand/middleware');
const headerSource = await readFile(new URL('../../components/Header.tsx', import.meta.url), 'utf8');
const headerAst = ts.createSourceFile('Header.tsx', headerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let headerNetworkEffect;
function findNetworkEffect(node) {
  if (ts.isCallExpression(node) && node.expression.getText(headerAst) === 'useEffect'
      && node.arguments[0]?.getText(headerAst).includes('setNetwork(')) {
    headerNetworkEffect = node.arguments[0].getText(headerAst);
  }
  ts.forEachChild(node, findNetworkEffect);
}
findNetworkEffect(headerAst);
assert.ok(headerNetworkEffect, 'Header network initialization effect must exist');

async function networkScenario(buildNetwork, urlNetwork, persistedNetwork = 'mainnet') {
  const scenarioEnv = { ...env, NEXT_PUBLIC_NETWORK: buildNetwork };
  const location = new URL('http://127.0.0.1:3006/swap/detail?asset=ordx:f:demo#orders');
  if (urlNetwork) location.searchParams.set('network', urlNetwork);
  const saved = new Map([['common-store', JSON.stringify({state:{network:persistedNetwork},version:0})]]);
  const localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) };
  const scenarioPage = { location, localStorage, history: { replaceState: (_state, _title, href) => { location.href = href; } } };
  const globals = { process: { env: scenarioEnv }, window: scenarioPage };
  const common = await load('store/common.ts', x => x, {
    ...globals,
    require: id => id === 'zustand/middleware'
      ? { ...middleware, persist: (initializer, options) => middleware.persist(initializer, { ...options, storage: middleware.createJSONStorage(() => localStorage) }) }
      : require(id),
  });
  const dependencies = { ...globals, require: () => common };
  const scenarioClient = (await load('api/clientApi.ts', x => x, dependencies)).default;
  const scenarioNavigation = await load('components/ChainSelect.tsx', x => `${x}\nexport { resolveBitcoinMarketUrl };`, dependencies);
  return {
    common, location, client: scenarioClient, navigation: scenarioNavigation,
    initializeHeader: () => vm.runInNewContext(`(${headerNetworkEffect})()`, {
      ...globals, URL, URLSearchParams,
      setNetwork: common.useCommonStore.getState().setNetwork,
      getConfiguredNetwork: common.getConfiguredNetwork,
    }),
  };
}

const cases = [
  ['mainnet indexer preserved', async () => { network='mainnet'; await client.getBestHeight(); assert.equal(lastUrl,'https://indexer.example/satsnet/mainnet/bestheight'); }],
  ['testnet indexer preserved', async () => { network='testnet'; await client.getBestHeight(); assert.equal(lastUrl,'https://indexer.example/satsnet/testnet/bestheight'); }],
  ['mainnet STP preserved', async () => { network='mainnet'; await market.getDeployedContractInfo(); assert.equal(lastUrl,'https://snet.example/stp/mainnet/info/contracts/deployed'); }],
  ['testnet STP preserved', async () => { network='testnet'; await market.getDeployedContractInfo(); assert.equal(lastUrl,'https://snet.example/stp/testnet/info/contracts/deployed'); }],
  ['regtest URL recognized', async () => { assert.equal(urls.getNetworkFromUrl(),'regtest'); }],
  ['regtest L2 indexer isolated', async () => { network='regtest'; chain='SatoshiNet'; await client.getBestHeight(); assert.equal(lastUrl,`${env.NEXT_PUBLIC_REGTEST_L2_INDEXER_URL}/bestheight`); }],
  ['regtest L1 asset query isolated', async () => { network='regtest'; await client.getAddressSummary('bcrt1-test','Bitcoin'); assert.equal(lastUrl,`${env.NEXT_PUBLIC_REGTEST_L1_INDEXER_URL}/v3/address/summary/bcrt1-test`); }],
  ['regtest STP registry isolated', async () => { network='regtest'; await market.getDeployedContractInfo(); assert.equal(lastUrl,`${env.NEXT_PUBLIC_REGTEST_STP_URL}/info/contracts/deployed`); }],
  ['chain switch preserves regtest', async () => { network='regtest'; const target = new URL(navigation.resolveBitcoinMarketUrl()); assert.equal(target.origin,'http://127.0.0.1:3001'); assert.equal(target.searchParams.get('network'),'regtest'); }],
  ...['mainnet', 'testnet'].map(urlNetwork => [`regtest build overrides conflicting ${urlNetwork} URL in Header and API`, async () => {
    const scenario = await networkScenario('regtest', urlNetwork, urlNetwork);
    assert.equal(scenario.common.useCommonStore.getState().network, 'regtest', 'hydration must stay on regtest');
    scenario.initializeHeader();
    assert.equal(scenario.common.useCommonStore.getState().network, 'regtest', 'Header must not override the build network');
    assert.equal(scenario.location.searchParams.get('network'), 'regtest');
    assert.equal(scenario.location.pathname, '/swap/detail');
    assert.equal(scenario.location.searchParams.get('asset'), 'ordx:f:demo');
    assert.equal(scenario.location.hash, '#orders');
    assert.equal(scenario.common.getConfiguredNetwork(), 'regtest');
    await scenario.client.getBestHeight();
    assert.equal(lastUrl, `${env.NEXT_PUBLIC_REGTEST_L2_INDEXER_URL}/bestheight`);
    assert.equal(new URL(scenario.navigation.resolveBitcoinMarketUrl()).searchParams.get('network'), 'regtest');
  }]),
  ['regtest build ignores stale persisted network and normalizes a missing URL network', async () => {
    const scenario = await networkScenario('regtest', undefined, 'testnet');
    scenario.initializeHeader();
    assert.equal(scenario.common.useCommonStore.getState().network, 'regtest');
    assert.equal(scenario.location.searchParams.get('network'), 'regtest');
  }],
  ['regtest store rejects later network overrides', async () => {
    const { common } = await networkScenario('regtest', 'regtest');
    for (const network of ['mainnet', 'testnet']) {
      common.useCommonStore.getState().setNetwork(network);
      assert.equal(common.useCommonStore.getState().network, 'regtest');
    }
  }],
  ['regtest chain navigation ignores conflicting URL before Header mounts', async () => {
    for (const urlNetwork of ['mainnet', 'testnet']) {
      const scenario = await networkScenario('regtest', urlNetwork);
      const target = new URL(scenario.navigation.resolveBitcoinMarketUrl());
      assert.equal(target.origin, 'http://127.0.0.1:3001');
      assert.equal(target.searchParams.get('network'), 'regtest');
    }
  }],
  ...['mainnet', 'testnet'].map(urlNetwork => [`normal build preserves explicit ${urlNetwork} URL`, async () => {
    const scenario = await networkScenario('mainnet', urlNetwork, urlNetwork === 'mainnet' ? 'testnet' : 'mainnet');
    const originalHref = scenario.location.href;
    scenario.initializeHeader();
    assert.equal(scenario.common.useCommonStore.getState().network, urlNetwork);
    assert.equal(scenario.common.getConfiguredNetwork(), urlNetwork);
    assert.equal(scenario.location.href, originalHref);
    await scenario.client.getBestHeight();
    assert.equal(lastUrl, `${env.NEXT_PUBLIC_ORDX_HOST}/satsnet/${urlNetwork}/bestheight`);
    assert.equal(new URL(scenario.navigation.resolveBitcoinMarketUrl()).searchParams.get('network'), urlNetwork);
    const nextNetwork = urlNetwork === 'mainnet' ? 'testnet' : 'mainnet';
    scenario.common.useCommonStore.getState().setNetwork(nextNetwork);
    assert.equal(scenario.common.useCommonStore.getState().network, nextNetwork, 'normal builds must still allow network changes');
  }]),
  ['normal build preserves persisted testnet when URL has no network', async () => {
    const scenario = await networkScenario('mainnet', undefined, 'testnet');
    scenario.initializeHeader();
    assert.equal(scenario.common.useCommonStore.getState().network, 'testnet');
    assert.equal(scenario.common.getConfiguredNetwork(), 'testnet');
    assert.equal(scenario.location.searchParams.has('network'), false);
    assert.equal(new URL(scenario.navigation.resolveBitcoinMarketUrl()).searchParams.get('network'), 'testnet');
  }],
];
let failed=0;
for (const [name, run] of cases) { try { await run(); console.log(`PASS ${name}`); } catch(e) { failed++; console.error(`FAIL ${name}: ${e.message}`); } }
console.log(JSON.stringify({passed:cases.length-failed,failed,total:cases.length}));
process.exitCode = failed ? 1 : 0;
