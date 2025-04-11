import { core } from '../wallet-sdk';

export enum NetworkType {
  MAINNET,
  TESTNET,
  REGTEST,
}

/**
 * Convert network type to bitcoinjs-lib network.
 */
export function toPsbtNetwork(networkType: NetworkType) {
  if (networkType === NetworkType.MAINNET) {
    return core.bitcoin.networks.bitcoin;
  } else if (networkType === NetworkType.TESTNET) {
    return core.bitcoin.networks.testnet;
  } else {
    return core.bitcoin.networks.regtest;
  }
}

/**
 * Convert bitcoinjs-lib network to network type.
 */
export function toNetworkType(network: core.bitcoin.Network) {
  if (network.bech32 == core.bitcoin.networks.bitcoin.bech32) {
    return NetworkType.MAINNET;
  } else if (network.bech32 == core.bitcoin.networks.testnet.bech32) {
    return NetworkType.TESTNET;
  } else {
    return NetworkType.REGTEST;
  }
}
