import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { UTXO_DUST } from '../constants';
import { ErrorCodes, WalletUtilsError } from '../error';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
export function sendBTC(_x) {
  return _sendBTC.apply(this, arguments);
}
function _sendBTC() {
  _sendBTC = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var btcUtxos,
        tos,
        networkType,
        changeAddress,
        feeRate,
        _ref$enableRBF,
        enableRBF,
        memo,
        memos,
        tx,
        toSignInputs,
        psbt;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1)
          switch ((_context.prev = _context.next)) {
            case 0:
              (btcUtxos = _ref.btcUtxos),
                (tos = _ref.tos),
                (networkType = _ref.networkType),
                (changeAddress = _ref.changeAddress),
                (feeRate = _ref.feeRate),
                (_ref$enableRBF = _ref.enableRBF),
                (enableRBF = _ref$enableRBF === void 0 ? true : _ref$enableRBF),
                (memo = _ref.memo),
                (memos = _ref.memos);
              if (!utxoHelper.hasAnyAssets(btcUtxos)) {
                _context.next = 3;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 3:
              tx = new Transaction();
              tx.setNetworkType(networkType);
              tx.setFeeRate(feeRate);
              tx.setEnableRBF(enableRBF);
              tx.setChangeAddress(changeAddress);
              tos.forEach(function (v) {
                tx.addOutput(v.address, v.satoshis);
              });
              if (memo) {
                if (Buffer.from(memo, 'hex').toString('hex') === memo) {
                  tx.addOpreturn([Buffer.from(memo, 'hex')]);
                } else {
                  tx.addOpreturn([Buffer.from(memo)]);
                }
              } else if (memos) {
                if (Buffer.from(memos[0], 'hex').toString('hex') === memos[0]) {
                  tx.addOpreturn(
                    memos.map(function (memo) {
                      return Buffer.from(memo, 'hex');
                    }),
                  );
                } else {
                  tx.addOpreturn(
                    memos.map(function (memo) {
                      return Buffer.from(memo);
                    }),
                  );
                }
              }
              _context.next = 12;
              return tx.addSufficientUtxosForFee(btcUtxos);
            case 12:
              toSignInputs = _context.sent;
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 15:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _sendBTC.apply(this, arguments);
}
export function sendAllBTC(_x2) {
  return _sendAllBTC.apply(this, arguments);
}
function _sendAllBTC() {
  _sendAllBTC = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee2(_ref2) {
      var btcUtxos,
        toAddress,
        networkType,
        feeRate,
        _ref2$enableRBF,
        enableRBF,
        tx,
        toSignInputs,
        fee,
        unspent,
        psbt;
      return _regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1)
          switch ((_context2.prev = _context2.next)) {
            case 0:
              (btcUtxos = _ref2.btcUtxos),
                (toAddress = _ref2.toAddress),
                (networkType = _ref2.networkType),
                (feeRate = _ref2.feeRate),
                (_ref2$enableRBF = _ref2.enableRBF),
                (enableRBF =
                  _ref2$enableRBF === void 0 ? true : _ref2$enableRBF);
              if (!utxoHelper.hasAnyAssets(btcUtxos)) {
                _context2.next = 3;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 3:
              tx = new Transaction();
              tx.setNetworkType(networkType);
              tx.setFeeRate(feeRate);
              tx.setEnableRBF(enableRBF);
              tx.addOutput(toAddress, UTXO_DUST);
              toSignInputs = [];
              btcUtxos.forEach(function (v, index) {
                tx.addInput(v);
                toSignInputs.push({
                  index: index,
                  publicKey: v.pubkey,
                });
              });
              _context2.next = 12;
              return tx.calNetworkFee();
            case 12:
              fee = _context2.sent;
              unspent = tx.getTotalInput() - fee;
              if (!(unspent < UTXO_DUST)) {
                _context2.next = 16;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.INSUFFICIENT_BTC_UTXO);
            case 16:
              tx.outputs[0].value = unspent;
              psbt = tx.toPsbt();
              return _context2.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 19:
            case 'end':
              return _context2.stop();
          }
      }, _callee2);
    }),
  );
  return _sendAllBTC.apply(this, arguments);
}
