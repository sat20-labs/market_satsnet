import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { publicKeyToAddress, scriptPkToAddress } from '../address';
import { ECPair, bitcoin } from '../bitcoin-core';
import { SimpleKeyring } from '../keyring';
import { signMessageOfBIP322Simple } from '../message';
import { NetworkType, toPsbtNetwork } from '../network';
import { AddressType } from '../types';
import { toXOnly } from '../utils';
/**
 * EstimateWallet is a wallet that can be used to estimate the size of a transaction.
 */
export var EstimateWallet = /*#__PURE__*/ (function () {
  function EstimateWallet(wif, networkType, addressType) {
    if (networkType === void 0) {
      networkType = NetworkType.MAINNET;
    }
    if (addressType === void 0) {
      addressType = AddressType.P2WPKH;
    }
    var network = toPsbtNetwork(networkType);
    var keyPair = ECPair.fromWIF(wif, network);
    this.keyring = new SimpleKeyring([keyPair.privateKey.toString('hex')]);
    this.keyring.addAccounts(1);
    this.pubkey = keyPair.publicKey.toString('hex');
    this.address = publicKeyToAddress(this.pubkey, addressType, networkType);
    this.network = network;
    this.networkType = networkType;
    this.addressType = addressType;
  }
  EstimateWallet.fromRandom = function fromRandom(addressType, networkType) {
    if (addressType === void 0) {
      addressType = AddressType.P2WPKH;
    }
    if (networkType === void 0) {
      networkType = NetworkType.MAINNET;
    }
    var network = toPsbtNetwork(networkType);
    var ecpair = ECPair.makeRandom({
      network: network,
    });
    var wallet = new EstimateWallet(ecpair.toWIF(), networkType, addressType);
    return wallet;
  };
  var _proto = EstimateWallet.prototype;
  _proto.getNetworkType = function getNetworkType() {
    return this.networkType;
  };
  _proto.formatOptionsToSignInputs = /*#__PURE__*/ (function () {
    var _formatOptionsToSignInputs = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_psbt, options) {
        var _this = this;
        var accountAddress,
          accountPubkey,
          toSignInputs,
          networkType,
          psbtNetwork,
          psbt;
        return _regeneratorRuntime.wrap(
          function _callee$(_context) {
            while (1)
              switch ((_context.prev = _context.next)) {
                case 0:
                  accountAddress = this.address;
                  _context.next = 3;
                  return this.getPublicKey();
                case 3:
                  accountPubkey = _context.sent;
                  toSignInputs = [];
                  if (options && options.toSignInputs) {
                    // We expect userToSignInputs objects to be similar to ToSignInput interface,
                    // but we allow address to be specified in addition to publicKey for convenience.
                    toSignInputs = options.toSignInputs.map(function (input) {
                      var _input$sighashTypes;
                      var index = Number(input.index);
                      if (isNaN(index))
                        throw new Error('invalid index in toSignInput');
                      if (!input.address && !input.publicKey) {
                        throw new Error(
                          'no address or public key in toSignInput',
                        );
                      }
                      if (input.address && input.address != accountAddress) {
                        throw new Error('invalid address in toSignInput');
                      }
                      if (input.publicKey && input.publicKey != accountPubkey) {
                        throw new Error('invalid public key in toSignInput');
                      }
                      var sighashTypes =
                        (_input$sighashTypes = input.sighashTypes) == null
                          ? void 0
                          : _input$sighashTypes.map(Number);
                      if (sighashTypes != null && sighashTypes.some(isNaN))
                        throw new Error('invalid sighash type in toSignInput');
                      return {
                        index: index,
                        publicKey: accountPubkey,
                        sighashTypes: sighashTypes,
                        disableTweakSigner: input.disableTweakSigner,
                      };
                    });
                  } else {
                    networkType = this.getNetworkType();
                    psbtNetwork = toPsbtNetwork(networkType);
                    psbt =
                      typeof _psbt === 'string'
                        ? bitcoin.Psbt.fromHex(_psbt, {
                            network: psbtNetwork,
                          })
                        : _psbt;
                    psbt.data.inputs.forEach(function (v, index) {
                      var script = null;
                      var value = 0;
                      if (v.witnessUtxo) {
                        script = v.witnessUtxo.script;
                        value = v.witnessUtxo.value;
                      } else if (v.nonWitnessUtxo) {
                        var tx = bitcoin.Transaction.fromBuffer(
                          v.nonWitnessUtxo,
                        );
                        var output = tx.outs[psbt.txInputs[index].index];
                        script = output.script;
                        value = output.value;
                      }
                      var isSigned = v.finalScriptSig || v.finalScriptWitness;
                      if (script && !isSigned) {
                        var address = scriptPkToAddress(
                          script,
                          _this.networkType,
                        );
                        if (accountAddress === address) {
                          toSignInputs.push({
                            index: index,
                            publicKey: accountPubkey,
                            sighashTypes: v.sighashType
                              ? [v.sighashType]
                              : undefined,
                          });
                        }
                      }
                    });
                  }
                  return _context.abrupt('return', toSignInputs);
                case 7:
                case 'end':
                  return _context.stop();
              }
          },
          _callee,
          this,
        );
      }),
    );
    function formatOptionsToSignInputs(_x, _x2) {
      return _formatOptionsToSignInputs.apply(this, arguments);
    }
    return formatOptionsToSignInputs;
  })();
  _proto.signPsbt = /*#__PURE__*/ (function () {
    var _signPsbt = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee2(psbt, opts) {
        var _this2 = this;
        var _opts, _inputs;
        return _regeneratorRuntime.wrap(
          function _callee2$(_context2) {
            while (1)
              switch ((_context2.prev = _context2.next)) {
                case 0:
                  _opts = opts || {
                    autoFinalized: true,
                    toSignInputs: [],
                  };
                  _context2.next = 3;
                  return this.formatOptionsToSignInputs(psbt, opts);
                case 3:
                  _inputs = _context2.sent;
                  if (!(_inputs.length == 0)) {
                    _context2.next = 6;
                    break;
                  }
                  throw new Error('no input to sign');
                case 6:
                  psbt.data.inputs.forEach(function (v, index) {
                    var isNotSigned = !(
                      v.finalScriptSig || v.finalScriptWitness
                    );
                    var isP2TR =
                      _this2.addressType === AddressType.P2TR ||
                      _this2.addressType === AddressType.M44_P2TR;
                    var lostInternalPubkey = !v.tapInternalKey;
                    // Special measures taken for compatibility with certain applications.
                    if (isNotSigned && isP2TR && lostInternalPubkey) {
                      var _v$witnessUtxo;
                      var tapInternalKey = toXOnly(
                        Buffer.from(_this2.pubkey, 'hex'),
                      );
                      var _bitcoin$payments$p2t = bitcoin.payments.p2tr({
                          internalPubkey: tapInternalKey,
                          network: toPsbtNetwork(_this2.networkType),
                        }),
                        output = _bitcoin$payments$p2t.output;
                      if (
                        ((_v$witnessUtxo = v.witnessUtxo) == null
                          ? void 0
                          : _v$witnessUtxo.script.toString('hex')) ==
                        (output == null ? void 0 : output.toString('hex'))
                      ) {
                        v.tapInternalKey = tapInternalKey;
                      }
                    }
                  });
                  _context2.next = 9;
                  return this.keyring.signTransaction(psbt, _inputs);
                case 9:
                  psbt = _context2.sent;
                  if (_opts.autoFinalized) {
                    _inputs.forEach(function (v) {
                      // psbt.validateSignaturesOfInput(v.index, validator);
                      psbt.finalizeInput(v.index);
                    });
                  }
                  return _context2.abrupt('return', psbt);
                case 12:
                case 'end':
                  return _context2.stop();
              }
          },
          _callee2,
          this,
        );
      }),
    );
    function signPsbt(_x3, _x4) {
      return _signPsbt.apply(this, arguments);
    }
    return signPsbt;
  })();
  _proto.getPublicKey = /*#__PURE__*/ (function () {
    var _getPublicKey = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee3() {
        var pubkeys;
        return _regeneratorRuntime.wrap(
          function _callee3$(_context3) {
            while (1)
              switch ((_context3.prev = _context3.next)) {
                case 0:
                  _context3.next = 2;
                  return this.keyring.getAccounts();
                case 2:
                  pubkeys = _context3.sent;
                  return _context3.abrupt('return', pubkeys[0]);
                case 4:
                case 'end':
                  return _context3.stop();
              }
          },
          _callee3,
          this,
        );
      }),
    );
    function getPublicKey() {
      return _getPublicKey.apply(this, arguments);
    }
    return getPublicKey;
  })();
  _proto.signMessage = /*#__PURE__*/ (function () {
    var _signMessage = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee4(text, type) {
        var pubkey;
        return _regeneratorRuntime.wrap(
          function _callee4$(_context4) {
            while (1)
              switch ((_context4.prev = _context4.next)) {
                case 0:
                  if (!(type === 'bip322-simple')) {
                    _context4.next = 6;
                    break;
                  }
                  _context4.next = 3;
                  return signMessageOfBIP322Simple({
                    message: text,
                    address: this.address,
                    networkType: this.networkType,
                    wallet: this,
                  });
                case 3:
                  return _context4.abrupt('return', _context4.sent);
                case 6:
                  _context4.next = 8;
                  return this.getPublicKey();
                case 8:
                  pubkey = _context4.sent;
                  _context4.next = 11;
                  return this.keyring.signMessage(pubkey, text);
                case 11:
                  return _context4.abrupt('return', _context4.sent);
                case 12:
                case 'end':
                  return _context4.stop();
              }
          },
          _callee4,
          this,
        );
      }),
    );
    function signMessage(_x5, _x6) {
      return _signMessage.apply(this, arguments);
    }
    return signMessage;
  })();
  return EstimateWallet;
})();
