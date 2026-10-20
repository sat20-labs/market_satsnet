import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = process.argv[2] || new URL('../../domain/services/prediction.ts', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  fileName: 'prediction.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const exports = {};
let forwarded;
vm.runInNewContext(compiled, {
  exports,
  require: id => {
    assert.equal(id, '@/lib/walletAdapter');
    return { getWalletAdapter: () => ({ invokeUnifiedContract: async req => { forwarded = req; return req; } }) };
  },
});
const plain = value => JSON.parse(JSON.stringify(value));
const address = 'tc1-regtest-prediction';
const common = {
  ContractType: 'agent', SubType: 'prediction', ContractAddress: address,
  Action: 'bet', Param: JSON.stringify({ outcome_id: 'a' }), GasLimit: 100000,
};
const cases = [
  ['satoshi funding uses Value and omits Assets', () => {
    assert.deepEqual(plain(exports.buildPredictionBetRequest(address, 'a', '::', '1000')), { ...common, Value: 1000 });
  }],
  ...['ordx:f:pwapos', 'brc20:f:sgas'].map(asset => [`${asset} funding unchanged`, () => {
    assert.deepEqual(plain(exports.buildPredictionBetRequest(address, 'a', asset, '12.5')), {
      ...common, Assets: [{ AssetName: asset, Amount: '12.5' }],
    });
  }]),
  ...['0', '-1', '1.5', '9007199254740993', 'not-a-number'].map(amount => [`reject invalid satoshi amount ${amount}`, () => {
    assert.throws(() => exports.buildPredictionBetRequest(address, 'a', '::', amount));
  }]),
  ['wallet adapter receives the same satoshi request', async () => {
    forwarded = undefined;
    await exports.invokePredictionBet(address, 'a', '::', '1000');
    assert.deepEqual(plain(forwarded), { ...common, Value: 1000 });
  }],
];
let failed = 0;
for (const [name, run] of cases) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
}
console.log(JSON.stringify({ passed: cases.length - failed, failed, total: cases.length }));
process.exitCode = failed ? 1 : 0;
