import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import Decimal from 'decimal.js';

import { evaluateSwapQuote } from './swapQuote.ts';

// Exercise the actual component formulas without mounting the wallet/provider UI.
const swapSource = readFileSync(new URL('./Swap.tsx', import.meta.url), 'utf8');
function poolQuote(direction, poolAsset, poolSats, precision = 0) {
  const ratio = swapSource.match(/const AMM_NET_INPUT_RATIO = .*;/)?.[0];
  const formulas = swapSource.slice(
    swapSource.indexOf('  const calcToAmount ='),
    swapSource.indexOf('  // 获取服务费'),
  ).replaceAll('(input: string)', '(input)');
  assert.ok(ratio && formulas.includes('calcFromAmount'));
  return runInNewContext(`${ratio}\n${formulas}\n;({ calcToAmount, calcFromAmount })`, {
    Decimal,
    console: { log() {} },
    swapType: direction,
    assetAmtInPool: { value: poolAsset },
    satValue: poolSats,
    contractK: new Decimal(poolAsset).mul(poolSats),
    assetPrecision: precision,
    ammAssetDecimals: Math.min(precision, 10),
  });
}

test('AMM sell quote retains fractional effective input for indivisible assets', () => {
  const quote = poolQuote('asset-to-sats', '9', 1111);
  assert.equal(quote.calcToAmount('1'), '110');
  assert.equal(quote.calcFromAmount('110'), '1');
  assert.equal(quote.calcFromAmount('111'), '2', 'round input up, never promise an underfunded output');
});

test('AMM buy and inverse quotes include the input fee', () => {
  const quote = poolQuote('sats-to-asset', '10', 1000);
  assert.equal(quote.calcFromAmount('1'), '113');
  assert.equal(quote.calcToAmount('113'), '1');
  assert.equal(quote.calcToAmount('112'), '0');
});

test('AMM fractional quotes round outputs down and required inputs up', () => {
  const sell = poolQuote('asset-to-sats', '9', 1111, 2);
  assert.equal(sell.calcFromAmount('110'), '1.00');
  assert.equal(sell.calcFromAmount('111'), '1.01');
  assert.ok(Number(sell.calcToAmount(sell.calcFromAmount('111'))) >= 111);
  const buy = poolQuote('sats-to-asset', '10', 1000, 2);
  assert.equal(buy.calcToAmount('10'), '0.09');
  assert.ok(Number(buy.calcToAmount(buy.calcFromAmount('0.09'))) >= 0.09);
  assert.equal(buy.calcFromAmount('10'), '');
  assert.equal(sell.calcFromAmount('1111'), '');
});

test('rejects a sell whose rounded AMM output cannot cover fees', () => {
  const poolAsset = 195_999;
  const poolSats = 16;
  const assetIn = 10_000;
  const grossReceive = Math.floor(
    poolSats - (poolSats * poolAsset) / (poolAsset + assetIn),
  );
  assert.equal(grossReceive, 0, 'ORDXYZ boundary quote must round down to zero sats');

  assert.deepEqual(
    evaluateSwapQuote({
      direction: 'asset-to-sats',
      grossReceive,
      serviceFee: 10,
      networkFee: 10,
    }),
    { netReceive: 0, canSubmit: false },
  );
});

test('rejects a sell whose output only equals its fees', () => {
  assert.deepEqual(
    evaluateSwapQuote({
      direction: 'asset-to-sats',
      grossReceive: 20,
      serviceFee: 10,
      networkFee: 10,
    }),
    { netReceive: 0, canSubmit: false },
  );
});

test('allows a sell only when its net receive is positive', () => {
  assert.deepEqual(
    evaluateSwapQuote({
      direction: 'asset-to-sats',
      grossReceive: 21,
      serviceFee: 10,
      networkFee: 10,
    }),
    { netReceive: 1, canSubmit: true },
  );
});

test('buy validation requires a positive rounded asset output', () => {
  assert.equal(evaluateSwapQuote({
    direction: 'sats-to-asset', grossReceive: 0, serviceFee: 10, networkFee: 10,
  }).canSubmit, false);
  assert.equal(evaluateSwapQuote({
    direction: 'sats-to-asset', grossReceive: 1, serviceFee: 10, networkFee: 10,
  }).canSubmit, true);
});
