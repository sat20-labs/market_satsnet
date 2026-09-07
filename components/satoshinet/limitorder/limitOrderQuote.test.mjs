import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateLimitOrderValue } from './limitOrderQuote.ts';

test('rejects a limit order whose exact value is below one sat', () => {
  const quote = calculateLimitOrderValue('0.09', '10');
  assert.equal(quote?.exactSats.toString(), '0.9');
  assert.equal(quote?.roundedSats, '1');
  assert.equal(quote?.isAtLeastOneSat, false);
});

test('accepts the one-sat boundary without floating-point rounding', () => {
  assert.equal(
    calculateLimitOrderValue('0.001', '1000')?.isAtLeastOneSat,
    true,
  );
  assert.equal(
    calculateLimitOrderValue('0.000999', '1000')?.isAtLeastOneSat,
    false,
  );
});

test('keeps the accepted 0.09 x 1000 total at 90 sats', () => {
  const quote = calculateLimitOrderValue('0.09', '1000');
  assert.equal(quote?.roundedSats, '90');
  assert.equal(quote?.isAtLeastOneSat, true);
});
