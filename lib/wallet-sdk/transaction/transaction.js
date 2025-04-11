import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { addressToScriptPk } from '../address';
import { bitcoin } from '../bitcoin-core';
import { UTXO_DUST } from '../constants';
import { ErrorCodes, WalletUtilsError } from '../error';
import { toPsbtNetwork } from '../network';
import { AddressType } from '../types';
import { toXOnly } from '../utils';
import { EstimateWallet } from '../wallet';
import { utxoHelper } from './utxo';
/**
 * Convert UnspentOutput to PSBT TxInput
 */
function utxoToInput(utxo, estimate) {
  if (
    utxo.addressType === AddressType.P2TR ||
    utxo.addressType === AddressType.M44_P2TR
  ) {
    var data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.satoshis,
        script: Buffer.from(utxo.scriptPk, 'hex'),
      },
      tapInternalKey: toXOnly(Buffer.from(utxo.pubkey, 'hex')),
    };
    return {
      data: data,
      utxo: utxo,
    };
  } else if (
    utxo.addressType === AddressType.P2WPKH ||
    utxo.addressType === AddressType.M44_P2WPKH
  ) {
    var _data = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.satoshis,
        script: Buffer.from(utxo.scriptPk, 'hex'),
      },
    };
    return {
      data: _data,
      utxo: utxo,
    };
  } else if (utxo.addressType === AddressType.P2PKH) {
    if (!utxo.rawtx || estimate) {
      var _data2 = {
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          value: utxo.satoshis,
          script: Buffer.from(utxo.scriptPk, 'hex'),
        },
      };
      return {
        data: _data2,
        utxo: utxo,
      };
    } else {
      var _data3 = {
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(utxo.rawtx, 'hex'),
      };
      return {
        data: _data3,
        utxo: utxo,
      };
    }
  } else if (utxo.addressType === AddressType.P2SH_P2WPKH) {
    var redeemData = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(utxo.pubkey, 'hex'),
    });
    var _data4 = {
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        value: utxo.satoshis,
        script: Buffer.from(utxo.scriptPk, 'hex'),
      },
      redeemScript: redeemData.output,
    };
    return {
      data: _data4,
      utxo: utxo,
    };
  }
}

/**
 * Transaction
 */
export var Transaction = /*#__PURE__*/ (function () {
  function Transaction() {
    this.utxos = [];
    this.inputs = [];
    this.outputs = [];
    this.changeOutputIndex = -1;
    this.enableRBF = true;
    this._cacheNetworkFee = 0;
    this._cacheBtcUtxos = [];
    this._cacheToSignInputs = [];
  }
  var _proto = Transaction.prototype;
  _proto.setNetworkType = function setNetworkType(network) {
    this.networkType = network;
  };
  _proto.setEnableRBF = function setEnableRBF(enable) {
    this.enableRBF = enable;
  };
  _proto.setFeeRate = function setFeeRate(feeRate) {
    this.feeRate = feeRate;
  };
  _proto.setChangeAddress = function setChangeAddress(address) {
    this.changedAddress = address;
  };
  _proto.addInput = function addInput(utxo) {
    this.utxos.push(utxo);
    this.inputs.push(utxoToInput(utxo));
  };
  _proto.removeLastInput = function removeLastInput() {
    this.utxos = this.utxos.slice(0, -1);
    this.inputs = this.inputs.slice(0, -1);
  };
  _proto.getTotalInput = function getTotalInput() {
    return this.inputs.reduce(function (pre, cur) {
      return pre + cur.utxo.satoshis;
    }, 0);
  };
  _proto.getTotalOutput = function getTotalOutput() {
    return this.outputs.reduce(function (pre, cur) {
      return pre + cur.value;
    }, 0);
  };
  _proto.getUnspent = function getUnspent() {
    return this.getTotalInput() - this.getTotalOutput();
  };
  _proto.calNetworkFee = /*#__PURE__*/ (function () {
    var _calNetworkFee = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee() {
        var psbt, txSize, fee;
        return _regeneratorRuntime.wrap(
          function _callee$(_context) {
            while (1)
              switch ((_context.prev = _context.next)) {
                case 0:
                  _context.next = 2;
                  return this.createEstimatePsbt();
                case 2:
                  psbt = _context.sent;
                  txSize = psbt.extractTransaction(true).virtualSize();
                  fee = Math.ceil(txSize * this.feeRate);
                  return _context.abrupt('return', fee);
                case 6:
                case 'end':
                  return _context.stop();
              }
          },
          _callee,
          this,
        );
      }),
    );
    function calNetworkFee() {
      return _calNetworkFee.apply(this, arguments);
    }
    return calNetworkFee;
  })();
  _proto.addOutput = function addOutput(address, value) {
    this.outputs.push({
      address: address,
      value: value,
    });
  };
  _proto.addOpreturn = function addOpreturn(data) {
    var embed = bitcoin.payments.embed({
      data: data,
    });
    this.outputs.push({
      script: embed.output,
      value: 0,
    });
  };
  _proto.addScriptOutput = function addScriptOutput(script, value) {
    this.outputs.push({
      script: script,
      value: value,
    });
  };
  _proto.getOutput = function getOutput(index) {
    return this.outputs[index];
  };
  _proto.addChangeOutput = function addChangeOutput(value) {
    this.outputs.push({
      address: this.changedAddress,
      value: value,
    });
    this.changeOutputIndex = this.outputs.length - 1;
  };
  _proto.getChangeOutput = function getChangeOutput() {
    return this.outputs[this.changeOutputIndex];
  };
  _proto.getChangeAmount = function getChangeAmount() {
    var output = this.getChangeOutput();
    return output ? output.value : 0;
  };
  _proto.removeChangeOutput = function removeChangeOutput() {
    this.outputs.splice(this.changeOutputIndex, 1);
    this.changeOutputIndex = -1;
  };
  _proto.removeRecentOutputs = function removeRecentOutputs(count) {
    this.outputs.splice(-count);
  };
  _proto.toPsbt = function toPsbt() {
    var _this = this;
    var network = toPsbtNetwork(this.networkType);
    var psbt = new bitcoin.Psbt({
      network: network,
    });
    this.inputs.forEach(function (v, index) {
      if (v.utxo.addressType === AddressType.P2PKH) {
        if (v.data.witnessUtxo) {
          //@ts-ignore
          psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
        }
      }
      psbt.data.addInput(v.data);
      if (_this.enableRBF) {
        psbt.setInputSequence(index, 0xfffffffd);
      }
    });
    this.outputs.forEach(function (v) {
      if (v.address) {
        psbt.addOutput({
          address: v.address,
          value: v.value,
        });
      } else if (v.script) {
        psbt.addOutput({
          script: v.script,
          value: v.value,
        });
      }
    });
    return psbt;
  };
  _proto.clone = function clone() {
    var tx = new Transaction();
    tx.setNetworkType(this.networkType);
    tx.setFeeRate(this.feeRate);
    tx.setEnableRBF(this.enableRBF);
    tx.setChangeAddress(this.changedAddress);
    tx.utxos = this.utxos.map(function (v) {
      return Object.assign({}, v);
    });
    tx.inputs = this.inputs.map(function (v) {
      return v;
    });
    tx.outputs = this.outputs.map(function (v) {
      return v;
    });
    return tx;
  };
  _proto.createEstimatePsbt = /*#__PURE__*/ (function () {
    var _createEstimatePsbt = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee2() {
        var estimateWallet, scriptPk, tx, psbt, toSignInputs;
        return _regeneratorRuntime.wrap(
          function _callee2$(_context2) {
            while (1)
              switch ((_context2.prev = _context2.next)) {
                case 0:
                  estimateWallet = EstimateWallet.fromRandom(
                    this.inputs[0].utxo.addressType,
                    this.networkType,
                  );
                  scriptPk = addressToScriptPk(
                    estimateWallet.address,
                    this.networkType,
                  ).toString('hex');
                  tx = this.clone();
                  tx.utxos.forEach(function (v) {
                    v.pubkey = estimateWallet.pubkey;
                    v.scriptPk = scriptPk;
                  });
                  tx.inputs = [];
                  tx.utxos.forEach(function (v) {
                    var input = utxoToInput(v, true);
                    tx.inputs.push(input);
                  });
                  psbt = tx.toPsbt();
                  toSignInputs = tx.inputs.map(function (v, index) {
                    return {
                      index: index,
                      publicKey: estimateWallet.pubkey,
                    };
                  });
                  _context2.next = 10;
                  return estimateWallet.signPsbt(psbt, {
                    autoFinalized: true,
                    toSignInputs: toSignInputs,
                  });
                case 10:
                  return _context2.abrupt('return', psbt);
                case 11:
                case 'end':
                  return _context2.stop();
              }
          },
          _callee2,
          this,
        );
      }),
    );
    function createEstimatePsbt() {
      return _createEstimatePsbt.apply(this, arguments);
    }
    return createEstimatePsbt;
  })();
  _proto.selectBtcUtxos = function selectBtcUtxos() {
    var _this2 = this;
    var totalInput = this.getTotalInput();
    var totalOutput = this.getTotalOutput() + this._cacheNetworkFee;
    if (totalInput < totalOutput) {
      var _utxoHelper$selectBtc = utxoHelper.selectBtcUtxos(
          this._cacheBtcUtxos,
          totalOutput - totalInput,
        ),
        selectedUtxos = _utxoHelper$selectBtc.selectedUtxos,
        remainingUtxos = _utxoHelper$selectBtc.remainingUtxos;
      if (selectedUtxos.length == 0) {
        throw new WalletUtilsError(ErrorCodes.INSUFFICIENT_BTC_UTXO);
      }
      selectedUtxos.forEach(function (v) {
        _this2.addInput(v);
        _this2._cacheToSignInputs.push({
          index: _this2.inputs.length - 1,
          publicKey: v.pubkey,
        });
        _this2._cacheNetworkFee +=
          utxoHelper.getAddedVirtualSize(v.addressType) * _this2.feeRate;
      });
      this._cacheBtcUtxos = remainingUtxos;
      this.selectBtcUtxos();
    }
  };
  _proto.addSufficientUtxosForFee = /*#__PURE__*/ (function () {
    var _addSufficientUtxosForFee = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(
        function _callee3(btcUtxos, forceAsFee) {
          var dummyBtcUtxo, networkFee, dummyBtcUtxoSize, changeAmount;
          return _regeneratorRuntime.wrap(
            function _callee3$(_context3) {
              while (1)
                switch ((_context3.prev = _context3.next)) {
                  case 0:
                    if (!(btcUtxos.length > 0)) {
                      _context3.next = 15;
                      break;
                    }
                    this._cacheBtcUtxos = btcUtxos;
                    dummyBtcUtxo = Object.assign({}, btcUtxos[0]);
                    dummyBtcUtxo.satoshis = 2100000000000000;
                    this.addInput(dummyBtcUtxo);
                    this.addChangeOutput(0);
                    _context3.next = 8;
                    return this.calNetworkFee();
                  case 8:
                    networkFee = _context3.sent;
                    dummyBtcUtxoSize = utxoHelper.getAddedVirtualSize(
                      dummyBtcUtxo.addressType,
                    );
                    this._cacheNetworkFee =
                      networkFee - dummyBtcUtxoSize * this.feeRate;
                    this.removeLastInput();
                    this.selectBtcUtxos();
                    _context3.next = 22;
                    break;
                  case 15:
                    if (!forceAsFee) {
                      _context3.next = 17;
                      break;
                    }
                    throw new WalletUtilsError(
                      ErrorCodes.INSUFFICIENT_BTC_UTXO,
                    );
                  case 17:
                    if (!(this.getTotalInput() < this.getTotalOutput())) {
                      _context3.next = 19;
                      break;
                    }
                    throw new WalletUtilsError(
                      ErrorCodes.INSUFFICIENT_BTC_UTXO,
                    );
                  case 19:
                    _context3.next = 21;
                    return this.calNetworkFee();
                  case 21:
                    this._cacheNetworkFee = _context3.sent;
                  case 22:
                    changeAmount =
                      this.getTotalInput() -
                      this.getTotalOutput() -
                      Math.ceil(this._cacheNetworkFee);
                    if (changeAmount > UTXO_DUST) {
                      this.removeChangeOutput();
                      this.addChangeOutput(changeAmount);
                    } else {
                      this.removeChangeOutput();
                    }
                    return _context3.abrupt('return', this._cacheToSignInputs);
                  case 25:
                  case 'end':
                    return _context3.stop();
                }
            },
            _callee3,
            this,
          );
        },
      ),
    );
    function addSufficientUtxosForFee(_x, _x2) {
      return _addSufficientUtxosForFee.apply(this, arguments);
    }
    return addSufficientUtxosForFee;
  })();
  _proto.dumpTx = /*#__PURE__*/ (function () {
    var _dumpTx = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee4(psbt) {
        var tx, feeRate;
        return _regeneratorRuntime.wrap(
          function _callee4$(_context4) {
            while (1)
              switch ((_context4.prev = _context4.next)) {
                case 0:
                  tx = psbt.extractTransaction();
                  feeRate = psbt.getFeeRate();
                  console.log(
                    '\n=============================================================================================\nSummary\n  txid:     ' +
                      tx.getId() +
                      '\n  Size:     ' +
                      tx.byteLength() +
                      '\n  Fee Paid: ' +
                      psbt.getFee() +
                      '\n  Fee Rate: ' +
                      feeRate +
                      ' sat/vB\n  Detail:   ' +
                      psbt.txInputs.length +
                      ' Inputs, ' +
                      psbt.txOutputs.length +
                      ' Outputs\n----------------------------------------------------------------------------------------------\nInputs\n' +
                      this.inputs
                        .map(function (input, index) {
                          var str =
                            '\n=>' +
                            index +
                            ' ' +
                            input.data.witnessUtxo.value +
                            ' Sats\n        lock-size: ' +
                            input.data.witnessUtxo.script.length +
                            '\n        via ' +
                            input.data.hash +
                            ' [' +
                            input.data.index +
                            ']\n';
                          return str;
                        })
                        .join('') +
                      '\ntotal: ' +
                      this.getTotalInput() +
                      ' Sats\n----------------------------------------------------------------------------------------------\nOutputs\n' +
                      this.outputs
                        .map(function (output, index) {
                          var str =
                            '\n=>' +
                            index +
                            ' ' +
                            output.address +
                            ' ' +
                            output.value +
                            ' Sats';
                          return str;
                        })
                        .join('') +
                      '\n\ntotal: ' +
                      this.getTotalOutput() +
                      ' Sats\n=============================================================================================\n    ',
                  );
                case 3:
                case 'end':
                  return _context4.stop();
              }
          },
          _callee4,
          this,
        );
      }),
    );
    function dumpTx(_x3) {
      return _dumpTx.apply(this, arguments);
    }
    return dumpTx;
  })();
  return Transaction;
})();
