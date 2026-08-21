import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateSwapQuote } from './swapQuote.ts';

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
