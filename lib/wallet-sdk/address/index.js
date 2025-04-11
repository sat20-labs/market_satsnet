import { bitcoin } from '../bitcoin-core';
import { NetworkType, toPsbtNetwork } from '../network';
import { AddressType } from '../types';

/**
 * Convert public key to bitcoin payment object.
 */
export function publicKeyToPayment(publicKey, type, networkType) {
  var network = toPsbtNetwork(networkType);
  if (!publicKey) return null;
  var pubkey = Buffer.from(publicKey, 'hex');
  if (type === AddressType.P2PKH) {
    return bitcoin.payments.p2pkh({
      pubkey: pubkey,
      network: network,
    });
  } else if (type === AddressType.P2WPKH || type === AddressType.M44_P2WPKH) {
    return bitcoin.payments.p2wpkh({
      pubkey: pubkey,
      network: network,
    });
  } else if (type === AddressType.P2TR || type === AddressType.M44_P2TR) {
    return bitcoin.payments.p2tr({
      internalPubkey: pubkey.slice(1, 33),
      network: network,
    });
  } else if (type === AddressType.P2SH_P2WPKH) {
    var data = bitcoin.payments.p2wpkh({
      pubkey: pubkey,
      network: network,
    });
    return bitcoin.payments.p2sh({
      pubkey: pubkey,
      network: network,
      redeem: data,
    });
  }
}

/**
 * Convert public key to bitcoin address.
 */
export function publicKeyToAddress(publicKey, type, networkType) {
  var payment = publicKeyToPayment(publicKey, type, networkType);
  if (payment && payment.address) {
    return payment.address;
  } else {
    return '';
  }
}

/**
 * Convert public key to bitcoin scriptPk.
 */
export function publicKeyToScriptPk(publicKey, type, networkType) {
  var payment = publicKeyToPayment(publicKey, type, networkType);
  return payment.output.toString('hex');
}

/**
 * Convert bitcoin address to scriptPk.
 */
export function addressToScriptPk(address, networkType) {
  var network = toPsbtNetwork(networkType);
  return bitcoin.address.toOutputScript(address, network);
}

/**
 * Check if the address is valid.
 */
export function isValidAddress(address, networkType) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  var error;
  try {
    bitcoin.address.toOutputScript(address, toPsbtNetwork(networkType));
  } catch (e) {
    error = e;
  }
  if (error) {
    return false;
  } else {
    return true;
  }
}
export function decodeAddress(address) {
  var mainnet = bitcoin.networks.bitcoin;
  var testnet = bitcoin.networks.testnet;
  var regtest = bitcoin.networks.regtest;
  var decodeBase58;
  var decodeBech32;
  var networkType;
  var addressType;
  if (
    address.startsWith('bc1') ||
    address.startsWith('tb1') ||
    address.startsWith('bcrt1')
  ) {
    try {
      decodeBech32 = bitcoin.address.fromBech32(address);
      if (decodeBech32.prefix === mainnet.bech32) {
        networkType = NetworkType.MAINNET;
      } else if (decodeBech32.prefix === testnet.bech32) {
        networkType = NetworkType.TESTNET;
      } else if (decodeBech32.prefix === regtest.bech32) {
        networkType = NetworkType.REGTEST;
      }
      if (decodeBech32.version === 0) {
        if (decodeBech32.data.length === 20) {
          addressType = AddressType.P2WPKH;
        } else if (decodeBech32.data.length === 32) {
          addressType = AddressType.P2WSH;
        }
      } else if (decodeBech32.version === 1) {
        if (decodeBech32.data.length === 32) {
          addressType = AddressType.P2TR;
        }
      }
      return {
        networkType: networkType,
        addressType: addressType,
        dust: getAddressTypeDust(addressType),
      };
    } catch (e) {}
  } else {
    try {
      decodeBase58 = bitcoin.address.fromBase58Check(address);
      if (decodeBase58.version === mainnet.pubKeyHash) {
        networkType = NetworkType.MAINNET;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === testnet.pubKeyHash) {
        networkType = NetworkType.TESTNET;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === regtest.pubKeyHash) {
        // do not work
        networkType = NetworkType.REGTEST;
        addressType = AddressType.P2PKH;
      } else if (decodeBase58.version === mainnet.scriptHash) {
        networkType = NetworkType.MAINNET;
        addressType = AddressType.P2SH_P2WPKH;
      } else if (decodeBase58.version === testnet.scriptHash) {
        networkType = NetworkType.TESTNET;
        addressType = AddressType.P2SH_P2WPKH;
      } else if (decodeBase58.version === regtest.scriptHash) {
        // do not work
        networkType = NetworkType.REGTEST;
        addressType = AddressType.P2SH_P2WPKH;
      }
      return {
        networkType: networkType,
        addressType: addressType,
        dust: getAddressTypeDust(addressType),
      };
    } catch (e) {}
  }
  return {
    networkType: NetworkType.MAINNET,
    addressType: AddressType.UNKNOWN,
    dust: 546,
  };
}
function getAddressTypeDust(addressType) {
  if (
    addressType === AddressType.P2WPKH ||
    addressType === AddressType.M44_P2WPKH
  ) {
    return 294;
  } else if (
    addressType === AddressType.P2TR ||
    addressType === AddressType.M44_P2TR
  ) {
    return 330;
  } else {
    return 546;
  }
}

/**
 * Get address type.
 */
export function getAddressType(address, networkType) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  return decodeAddress(address).addressType;
}

/**
 * Convert scriptPk to address.
 */
export function scriptPkToAddress(scriptPk, networkType) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  var network = toPsbtNetwork(networkType);
  try {
    var address = bitcoin.address.fromOutputScript(
      typeof scriptPk === 'string' ? Buffer.from(scriptPk, 'hex') : scriptPk,
      network,
    );
    return address;
  } catch (e) {
    return '';
  }
}
