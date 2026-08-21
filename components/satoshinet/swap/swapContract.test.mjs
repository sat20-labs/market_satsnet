import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSwapContractUrl } from './swapContract.ts';

const asset = 'ordx:f:ordi';
const deployed = [
  'tb1-approved_ordx:f:ordi_amm.tc',
  'tb1-similar_ordx:f:ordxordi_amm.tc',
];

test('accepts a requested contract only when it is deployed for the asset', () => {
  assert.equal(
    resolveSwapContractUrl(deployed, asset, deployed[0]),
    deployed[0],
  );
});

test('rejects an undeployed contract supplied by a URL', () => {
  assert.equal(
    resolveSwapContractUrl(deployed, asset, 'tb1-attacker_ordx:f:ordi_amm.tc'),
    deployed[0],
  );
});

test('does not confuse a ticker with a longer ticker', () => {
  assert.equal(
    resolveSwapContractUrl([deployed[1]], asset),
    undefined,
  );
});
