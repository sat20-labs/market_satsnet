import { bitcoin } from '../bitcoin-core';
export var NetworkType = /*#__PURE__*/ (function (NetworkType) {
  NetworkType[(NetworkType['MAINNET'] = 0)] = 'MAINNET';
  NetworkType[(NetworkType['TESTNET'] = 1)] = 'TESTNET';
  NetworkType[(NetworkType['REGTEST'] = 2)] = 'REGTEST';
  return NetworkType;
})({});

/**
 * Convert network type to bitcoinjs-lib network.
 */
export function toPsbtNetwork(networkType) {
  if (networkType === NetworkType.MAINNET) {
    return bitcoin.networks.bitcoin;
  } else if (networkType === NetworkType.TESTNET) {
    return bitcoin.networks.testnet;
  } else {
    return bitcoin.networks.regtest;
  }
}

/**
 * Convert bitcoinjs-lib network to network type.
 */
export function toNetworkType(network) {
  if (network.bech32 == bitcoin.networks.bitcoin.bech32) {
    return NetworkType.MAINNET;
  } else if (network.bech32 == bitcoin.networks.testnet.bech32) {
    return NetworkType.TESTNET;
  } else {
    return NetworkType.REGTEST;
  }
}
