import BigNumber from 'bignumber.js';
import { ECPair, bitcoin, ecc } from './bitcoin-core';
export var toXOnly = function toXOnly(pubKey) {
  return pubKey.length === 32 ? pubKey : pubKey.slice(1, 33);
};
function tapTweakHash(pubKey, h) {
  return bitcoin.crypto.taggedHash(
    'TapTweak',
    Buffer.concat(h ? [pubKey, h] : [pubKey]),
  );
}

/**
 * Transform raw private key to taproot address private key
 */
export function tweakSigner(signer, opts) {
  if (opts === void 0) {
    opts = {};
  }
  // @ts-ignore
  var privateKey = signer.privateKey;
  if (!privateKey) {
    throw new Error('Private key is required for tweaking signer!');
  }
  if (signer.publicKey[0] === 3) {
    privateKey = ecc.privateNegate(privateKey);
  }
  var tweakedPrivateKey = ecc.privateAdd(
    privateKey,
    tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
  );
  if (!tweakedPrivateKey) {
    throw new Error('Invalid tweaked private key!');
  }
  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  });
}

/**
 * ECDSA signature validator
 */
export var validator = function validator(pubkey, msghash, signature) {
  return ECPair.fromPublicKey(pubkey).verify(msghash, signature);
};

/**
 * Schnorr signature validator
 */
export var schnorrValidator = function schnorrValidator(
  pubkey,
  msghash,
  signature,
) {
  return ECPair.fromPublicKey(pubkey).verifySchnorr(msghash, signature);
};

/**
 * Transform satoshis to btc format
 */
export function satoshisToAmount(val) {
  var num = new BigNumber(val);
  return num.dividedBy(100000000).toFixed(8);
}

/**
 * Transform btc format to satoshis
 */
export function amountToSaothis(val) {
  var num = new BigNumber(val);
  return num.multipliedBy(100000000).toNumber();
}
