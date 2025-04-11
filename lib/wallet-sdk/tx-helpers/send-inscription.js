import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { ErrorCodes, WalletUtilsError } from '../error';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
export function sendInscription(_x) {
  return _sendInscription.apply(this, arguments);
}
function _sendInscription() {
  _sendInscription = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var assetUtxo,
        btcUtxos,
        toAddress,
        networkType,
        changeAddress,
        feeRate,
        outputValue,
        _ref$enableRBF,
        enableRBF,
        _ref$enableMixed,
        enableMixed,
        maxOffset,
        tx,
        toSignInputs,
        psbt;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1)
          switch ((_context.prev = _context.next)) {
            case 0:
              (assetUtxo = _ref.assetUtxo),
                (btcUtxos = _ref.btcUtxos),
                (toAddress = _ref.toAddress),
                (networkType = _ref.networkType),
                (changeAddress = _ref.changeAddress),
                (feeRate = _ref.feeRate),
                (outputValue = _ref.outputValue),
                (_ref$enableRBF = _ref.enableRBF),
                (enableRBF = _ref$enableRBF === void 0 ? true : _ref$enableRBF),
                (_ref$enableMixed = _ref.enableMixed),
                (enableMixed =
                  _ref$enableMixed === void 0 ? false : _ref$enableMixed);
              if (!utxoHelper.hasAnyAssets(btcUtxos)) {
                _context.next = 3;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 3:
              if (!utxoHelper.hasAtomicals([assetUtxo])) {
                _context.next = 5;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 5:
              if (!(!enableMixed && assetUtxo.inscriptions.length !== 1)) {
                _context.next = 7;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 7:
              maxOffset = assetUtxo.inscriptions.reduce(function (pre, cur) {
                return Math.max(pre, cur.offset);
              }, 0);
              if (!(outputValue - 1 < maxOffset)) {
                _context.next = 10;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.ASSET_MAYBE_LOST);
            case 10:
              tx = new Transaction();
              tx.setNetworkType(networkType);
              tx.setFeeRate(feeRate);
              tx.setEnableRBF(enableRBF);
              tx.setChangeAddress(changeAddress);
              tx.addInput(assetUtxo);
              tx.addOutput(toAddress, outputValue);
              _context.next = 19;
              return tx.addSufficientUtxosForFee(btcUtxos);
            case 19:
              toSignInputs = _context.sent;
              toSignInputs.push({
                index: 0,
                publicKey: assetUtxo.pubkey,
              });
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 23:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _sendInscription.apply(this, arguments);
}
