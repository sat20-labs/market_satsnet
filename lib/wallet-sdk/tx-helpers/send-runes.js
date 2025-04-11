import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import bigInt from 'big-integer';
import { bitcoin } from '../bitcoin-core';
import { ErrorCodes, WalletUtilsError } from '../error';
import { varint } from '../runes';
import { RuneId } from '../runes/rund_id';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
// only one arc20 can be send
export function sendRunes(_x) {
  return _sendRunes.apply(this, arguments);
}
function _sendRunes() {
  _sendRunes = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var assetUtxos,
        btcUtxos,
        assetAddress,
        btcAddress,
        toAddress,
        networkType,
        runeid,
        runeAmount,
        outputValue,
        feeRate,
        _ref$enableRBF,
        enableRBF,
        tx,
        toSignInputs,
        fromRuneAmount,
        changedRuneAmount,
        payload,
        runeId,
        _toSignInputs,
        psbt;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1)
          switch ((_context.prev = _context.next)) {
            case 0:
              (assetUtxos = _ref.assetUtxos),
                (btcUtxos = _ref.btcUtxos),
                (assetAddress = _ref.assetAddress),
                (btcAddress = _ref.btcAddress),
                (toAddress = _ref.toAddress),
                (networkType = _ref.networkType),
                (runeid = _ref.runeid),
                (runeAmount = _ref.runeAmount),
                (outputValue = _ref.outputValue),
                (feeRate = _ref.feeRate),
                (_ref$enableRBF = _ref.enableRBF),
                (enableRBF = _ref$enableRBF === void 0 ? true : _ref$enableRBF);
              if (
                !(
                  utxoHelper.hasAtomicalsNFT(assetUtxos) ||
                  utxoHelper.hasInscription(assetUtxos)
                )
              ) {
                _context.next = 3;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 3:
              if (!utxoHelper.hasAnyAssets(btcUtxos)) {
                _context.next = 5;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 5:
              tx = new Transaction();
              tx.setNetworkType(networkType);
              tx.setFeeRate(feeRate);
              tx.setEnableRBF(enableRBF);
              tx.setChangeAddress(btcAddress);
              toSignInputs = []; // add assets
              assetUtxos.forEach(function (v, index) {
                tx.addInput(v);
                toSignInputs.push({
                  index: index,
                  publicKey: v.pubkey,
                });
              });
              fromRuneAmount = bigInt(0);
              assetUtxos.forEach(function (v) {
                if (v.runes) {
                  v.runes.forEach(function (w) {
                    if (w.runeid === runeid) {
                      fromRuneAmount = fromRuneAmount.plus(bigInt(w.amount));
                    }
                  });
                }
              });
              changedRuneAmount = fromRuneAmount.minus(bigInt(runeAmount));
              if (!changedRuneAmount.lt(0)) {
                _context.next = 17;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.INSUFFICIENT_ASSET_UTXO);
            case 17:
              payload = [];
              runeId = RuneId.fromString(runeid);
              varint.encodeToVec(0, payload);
              if (changedRuneAmount.gt(0)) {
                // add changed data
                varint.encodeToVec(runeId.block, payload);
                varint.encodeToVec(runeId.tx, payload);
                varint.encodeToVec(changedRuneAmount, payload);
                varint.encodeToVec(1, payload);

                // add send data
                varint.encodeToVec(0, payload);
                varint.encodeToVec(0, payload);
                varint.encodeToVec(runeAmount, payload);
                varint.encodeToVec(2, payload);
              } else {
                // add send data
                varint.encodeToVec(runeId.block, payload);
                varint.encodeToVec(runeId.tx, payload);
                varint.encodeToVec(runeAmount, payload);
                varint.encodeToVec(1, payload);
              }

              // add op_return
              tx.addScriptOutput(
                bitcoin.script.compile([
                  bitcoin.opcodes.OP_RETURN,
                  bitcoin.opcodes.OP_13,
                  Buffer.from(new Uint8Array(payload)),
                ]),
                0,
              );
              if (changedRuneAmount.gt(0)) {
                // add change
                tx.addOutput(assetAddress, outputValue);
              }

              // add receiver
              tx.addOutput(toAddress, outputValue);

              // add btc
              _context.next = 26;
              return tx.addSufficientUtxosForFee(btcUtxos, true);
            case 26:
              _toSignInputs = _context.sent;
              toSignInputs.push.apply(toSignInputs, _toSignInputs);
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 30:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _sendRunes.apply(this, arguments);
}
