import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { ErrorCodes, WalletUtilsError } from '../error';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
// only one arc20 can be send
export function sendAtomicalsFT(_x) {
  return _sendAtomicalsFT.apply(this, arguments);
}
function _sendAtomicalsFT() {
  _sendAtomicalsFT = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var assetUtxos,
        btcUtxos,
        toAddress,
        networkType,
        changeAssetAddress,
        sendAmount,
        changeAddress,
        feeRate,
        _ref$enableRBF,
        enableRBF,
        tx,
        toSignInputs,
        totalInputFTAmount,
        changeArc20Amount,
        _toSignInputs,
        psbt;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1)
          switch ((_context.prev = _context.next)) {
            case 0:
              (assetUtxos = _ref.assetUtxos),
                (btcUtxos = _ref.btcUtxos),
                (toAddress = _ref.toAddress),
                (networkType = _ref.networkType),
                (changeAssetAddress = _ref.changeAssetAddress),
                (sendAmount = _ref.sendAmount),
                (changeAddress = _ref.changeAddress),
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
              tx.setChangeAddress(changeAddress);
              toSignInputs = [];
              totalInputFTAmount = assetUtxos.reduce(function (acc, v) {
                return acc + v.satoshis;
              }, 0);
              if (!(sendAmount > totalInputFTAmount)) {
                _context.next = 14;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.INSUFFICIENT_ASSET_UTXO);
            case 14:
              // add assets
              assetUtxos.forEach(function (v, index) {
                tx.addInput(v);
                toSignInputs.push({
                  index: index,
                  publicKey: v.pubkey,
                });
              });

              // add receiver
              tx.addOutput(toAddress, sendAmount);

              // add change
              changeArc20Amount = totalInputFTAmount - sendAmount;
              if (changeArc20Amount > 0) {
                tx.addOutput(changeAssetAddress, changeArc20Amount);
              }

              // add btc
              _context.next = 20;
              return tx.addSufficientUtxosForFee(btcUtxos, true);
            case 20:
              _toSignInputs = _context.sent;
              toSignInputs.push.apply(toSignInputs, _toSignInputs);
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 24:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _sendAtomicalsFT.apply(this, arguments);
}
