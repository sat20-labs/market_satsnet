import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { ErrorCodes, WalletUtilsError } from '../error';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
export function sendAtomicalsNFT(_x) {
  return _sendAtomicalsNFT.apply(this, arguments);
}
function _sendAtomicalsNFT() {
  _sendAtomicalsNFT = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var assetUtxo,
        btcUtxos,
        toAddress,
        networkType,
        changeAddress,
        feeRate,
        _ref$enableRBF,
        enableRBF,
        tx,
        toSignInputs,
        _toSignInputs,
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
                (_ref$enableRBF = _ref.enableRBF),
                (enableRBF = _ref$enableRBF === void 0 ? true : _ref$enableRBF);
              if (
                !(
                  utxoHelper.hasAtomicalsFT([assetUtxo]) ||
                  utxoHelper.hasInscription([assetUtxo])
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
              if (!(assetUtxo.atomicals.length !== 1)) {
                _context.next = 7;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 7:
              tx = new Transaction();
              tx.setNetworkType(networkType);
              tx.setFeeRate(feeRate);
              tx.setEnableRBF(enableRBF);
              tx.setChangeAddress(changeAddress);
              toSignInputs = []; // add asset
              tx.addInput(assetUtxo);
              toSignInputs.push({
                index: 0,
                publicKey: assetUtxo.pubkey,
              });
              tx.addOutput(toAddress, assetUtxo.satoshis);

              // add btc
              _context.next = 18;
              return tx.addSufficientUtxosForFee(btcUtxos, true);
            case 18:
              _toSignInputs = _context.sent;
              toSignInputs.push.apply(toSignInputs, _toSignInputs);
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 22:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _sendAtomicalsNFT.apply(this, arguments);
}
