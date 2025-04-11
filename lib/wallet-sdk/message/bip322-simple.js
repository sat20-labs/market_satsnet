import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { encode } from 'varuint-bitcoin';
import { addressToScriptPk, getAddressType } from '../address';
import { bitcoin } from '../bitcoin-core';
import { NetworkType, toPsbtNetwork } from '../network';
import { AddressType } from '../types';
import { schnorrValidator, validator } from '../utils';
function bip0322_hash(message) {
  var sha256 = bitcoin.crypto.sha256;
  var tag = 'BIP0322-signed-message';
  var tagHash = sha256(Buffer.from(tag));
  var result = sha256(Buffer.concat([tagHash, tagHash, Buffer.from(message)]));
  return result.toString('hex');
}
export function genPsbtOfBIP322Simple(_ref) {
  var message = _ref.message,
    address = _ref.address,
    networkType = _ref.networkType;
  var outputScript = addressToScriptPk(address, networkType);
  var addressType = getAddressType(address, networkType);
  var supportedTypes = [
    AddressType.P2WPKH,
    AddressType.P2TR,
    AddressType.M44_P2WPKH,
    AddressType.M44_P2TR,
  ];
  if (supportedTypes.includes(addressType) == false) {
    throw new Error('Not support address type to sign');
  }
  var prevoutHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  );
  var prevoutIndex = 0xffffffff;
  var sequence = 0;
  var scriptSig = Buffer.concat([
    Buffer.from('0020', 'hex'),
    Buffer.from(bip0322_hash(message), 'hex'),
  ]);
  var txToSpend = new bitcoin.Transaction();
  txToSpend.version = 0;
  txToSpend.addInput(prevoutHash, prevoutIndex, sequence, scriptSig);
  txToSpend.addOutput(outputScript, 0);
  var psbtToSign = new bitcoin.Psbt();
  psbtToSign.setVersion(0);
  psbtToSign.addInput({
    hash: txToSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: outputScript,
      value: 0,
    },
  });
  psbtToSign.addOutput({
    script: Buffer.from('6a', 'hex'),
    value: 0,
  });
  return psbtToSign;
}
export function getSignatureFromPsbtOfBIP322Simple(psbt) {
  var txToSign = psbt.extractTransaction();
  function encodeVarString(b) {
    return Buffer.concat([encode(b.byteLength), b]);
  }
  var len = encode(txToSign.ins[0].witness.length);
  var result = Buffer.concat(
    [len].concat(
      txToSign.ins[0].witness.map(function (w) {
        return encodeVarString(w);
      }),
    ),
  );
  var signature = result.toString('base64');
  return signature;
}

/**
 * refference: https://github.com/bitcoin/bips/blob/master/bip-0322.mediawiki
 */
export function signMessageOfBIP322Simple(_x) {
  return _signMessageOfBIP322Simple.apply(this, arguments);
}
function _signMessageOfBIP322Simple() {
  _signMessageOfBIP322Simple = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref2) {
      var message, address, networkType, wallet, psbtToSign;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1)
          switch ((_context.prev = _context.next)) {
            case 0:
              (message = _ref2.message),
                (address = _ref2.address),
                (networkType = _ref2.networkType),
                (wallet = _ref2.wallet);
              psbtToSign = genPsbtOfBIP322Simple({
                message: message,
                address: address,
                networkType: networkType,
              });
              _context.next = 4;
              return wallet.signPsbt(psbtToSign);
            case 4:
              return _context.abrupt(
                'return',
                getSignatureFromPsbtOfBIP322Simple(psbtToSign),
              );
            case 5:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _signMessageOfBIP322Simple.apply(this, arguments);
}
export function verifyMessageOfBIP322Simple(
  address,
  msg,
  signature,
  networkType,
) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  var addressType = getAddressType(address, networkType);
  if (
    addressType === AddressType.P2WPKH ||
    addressType === AddressType.M44_P2WPKH
  ) {
    return verifySignatureOfBIP322Simple_P2PWPKH(
      address,
      msg,
      signature,
      networkType,
    );
  } else if (
    addressType === AddressType.P2TR ||
    addressType === AddressType.M44_P2TR
  ) {
    return verifySignatureOfBIP322Simple_P2TR(
      address,
      msg,
      signature,
      networkType,
    );
  }
  return false;
}
function verifySignatureOfBIP322Simple_P2TR(address, msg, sign, networkType) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  var network = toPsbtNetwork(networkType);
  var outputScript = bitcoin.address.toOutputScript(address, network);
  var prevoutHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  );
  var prevoutIndex = 0xffffffff;
  var sequence = 0;
  var scriptSig = Buffer.concat([
    Buffer.from('0020', 'hex'),
    Buffer.from(bip0322_hash(msg), 'hex'),
  ]);
  var txToSpend = new bitcoin.Transaction();
  txToSpend.version = 0;
  txToSpend.addInput(prevoutHash, prevoutIndex, sequence, scriptSig);
  txToSpend.addOutput(outputScript, 0);
  var data = Buffer.from(sign, 'base64');
  var _res = bitcoin.script.decompile(data.slice(1));
  var signature = _res[0];
  var pubkey = Buffer.from(
    '02' + outputScript.subarray(2).toString('hex'),
    'hex',
  );
  var psbtToSign = new bitcoin.Psbt();
  psbtToSign.setVersion(0);
  psbtToSign.addInput({
    hash: txToSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: outputScript,
      value: 0,
    },
  });
  psbtToSign.addOutput({
    script: Buffer.from('6a', 'hex'),
    value: 0,
  });
  var tapKeyHash = psbtToSign.__CACHE.__TX.hashForWitnessV1(
    0,
    [outputScript],
    [0],
    0,
  );
  var valid = schnorrValidator(pubkey, tapKeyHash, signature);
  return valid;
}
function verifySignatureOfBIP322Simple_P2PWPKH(
  address,
  msg,
  sign,
  networkType,
) {
  if (networkType === void 0) {
    networkType = NetworkType.MAINNET;
  }
  var network = toPsbtNetwork(networkType);
  var outputScript = bitcoin.address.toOutputScript(address, network);
  var prevoutHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex',
  );
  var prevoutIndex = 0xffffffff;
  var sequence = 0;
  var scriptSig = Buffer.concat([
    Buffer.from('0020', 'hex'),
    Buffer.from(bip0322_hash(msg), 'hex'),
  ]);
  var txToSpend = new bitcoin.Transaction();
  txToSpend.version = 0;
  txToSpend.addInput(prevoutHash, prevoutIndex, sequence, scriptSig);
  txToSpend.addOutput(outputScript, 0);
  var data = Buffer.from(sign, 'base64');
  var _res = bitcoin.script.decompile(data.slice(1));
  var psbtToSign = new bitcoin.Psbt();
  psbtToSign.setVersion(0);
  psbtToSign.addInput({
    hash: txToSpend.getHash(),
    index: 0,
    sequence: 0,
    witnessUtxo: {
      script: outputScript,
      value: 0,
    },
  });
  psbtToSign.addOutput({
    script: Buffer.from('6a', 'hex'),
    value: 0,
  });
  psbtToSign.updateInput(0, {
    partialSig: [
      {
        pubkey: _res[1],
        signature: _res[0],
      },
    ],
  });
  var valid = psbtToSign.validateSignaturesOfAllInputs(validator);
  return valid;
}
