function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it =
    (typeof Symbol !== 'undefined' && o[Symbol.iterator]) || o['@@iterator'];
  if (it) return (it = it.call(o)).next.bind(it);
  if (
    Array.isArray(o) ||
    (it = _unsupportedIterableToArray(o)) ||
    (allowArrayLike && o && typeof o.length === 'number')
  ) {
    if (it) o = it;
    var i = 0;
    return function () {
      if (i >= o.length) return { done: true };
      return { done: false, value: o[i++] };
    };
  }
  throw new TypeError(
    'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.',
  );
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === 'string') return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === 'Object' && o.constructor) n = o.constructor.name;
  if (n === 'Map' || n === 'Set') return Array.from(o);
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
import { decodeAddress } from '../address';
import { NetworkType } from '../network';
import { AddressType } from '../types';
function hasInscription(utxos) {
  if (
    utxos.find(function (v) {
      return v.inscriptions.length > 0;
    })
  ) {
    return true;
  }
  return false;
}
function hasAtomicalsFT(utxos) {
  if (
    utxos.find(function (v) {
      return v.atomicals.find(function (w) {
        return w.type === 'FT';
      });
    })
  ) {
    return true;
  }
  return false;
}
function hasAtomicalsNFT(utxos) {
  if (
    utxos.find(function (v) {
      return v.atomicals.find(function (w) {
        return w.type === 'NFT';
      });
    })
  ) {
    return true;
  }
  return false;
}
function hasAtomicals(utxos) {
  if (
    utxos.find(function (v) {
      return v.atomicals.length > 0;
    })
  ) {
    return true;
  }
  return false;
}
function hasAnyAssets(utxos) {
  if (
    utxos.find(function (v) {
      return v.inscriptions.length > 0 || v.atomicals.length > 0;
    })
  ) {
    return true;
  }
  return false;
}

/**
 * select utxos so that the total amount of utxos is greater than or equal to targetAmount
 * return the selected utxos and the unselected utxos
 * @param utxos
 * @param targetAmount
 */
function selectBtcUtxos(utxos, targetAmount) {
  var selectedUtxos = [];
  var remainingUtxos = [];
  var totalAmount = 0;
  for (
    var _iterator = _createForOfIteratorHelperLoose(utxos), _step;
    !(_step = _iterator()).done;

  ) {
    var utxo = _step.value;
    if (totalAmount < targetAmount) {
      totalAmount += utxo.satoshis;
      selectedUtxos.push(utxo);
    } else {
      remainingUtxos.push(utxo);
    }
  }
  return {
    selectedUtxos: selectedUtxos,
    remainingUtxos: remainingUtxos,
  };
}

/**
 * return the added virtual size of the utxo
 */
function getAddedVirtualSize(addressType) {
  if (
    addressType === AddressType.P2WPKH ||
    addressType === AddressType.M44_P2WPKH
  ) {
    return 41 + (1 + 1 + 72 + 1 + 33) / 4;
  } else if (
    addressType === AddressType.P2TR ||
    addressType === AddressType.M44_P2TR
  ) {
    return 41 + (1 + 1 + 64) / 4;
  } else if (addressType === AddressType.P2PKH) {
    return 41 + 1 + 1 + 72 + 1 + 33;
  } else if (addressType === AddressType.P2SH_P2WPKH) {
    return 41 + 24 + (1 + 1 + 72 + 1 + 33) / 4;
  }
  throw new Error('unknown address type');
}
export function getUtxoDust(addressType) {
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

// deprecated
export function getAddressUtxoDust(address, networkType) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  return decodeAddress(address).dust;
}
export var utxoHelper = {
  hasAtomicalsFT: hasAtomicalsFT,
  hasAtomicalsNFT: hasAtomicalsNFT,
  hasAtomicals: hasAtomicals,
  hasInscription: hasInscription,
  hasAnyAssets: hasAnyAssets,
  selectBtcUtxos: selectBtcUtxos,
  getAddedVirtualSize: getAddedVirtualSize,
  getUtxoDust: getUtxoDust,
  getAddressUtxoDust: getAddressUtxoDust,
};
