import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { ErrorCodes, WalletUtilsError } from '../error';
import { Transaction } from '../transaction/transaction';
import { utxoHelper } from '../transaction/utxo';
export function sendInscriptions(_x) {
  return _sendInscriptions.apply(this, arguments);
}
function _sendInscriptions() {
  _sendInscriptions = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var assetUtxos,
        btcUtxos,
        toAddress,
        networkType,
        changeAddress,
        feeRate,
        _ref$enableRBF,
        enableRBF,
        tx,
        toSignInputs,
        i,
        assetUtxo,
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
                (changeAddress = _ref.changeAddress),
                (feeRate = _ref.feeRate),
                (_ref$enableRBF = _ref.enableRBF),
                (enableRBF = _ref$enableRBF === void 0 ? true : _ref$enableRBF);
              if (!utxoHelper.hasAnyAssets(btcUtxos)) {
                _context.next = 3;
                break;
              }
              throw new WalletUtilsError(ErrorCodes.NOT_SAFE_UTXOS);
            case 3:
              if (!utxoHelper.hasAtomicals(assetUtxos)) {
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
              i = 0;
            case 12:
              if (!(i < assetUtxos.length)) {
                _context.next = 22;
                break;
              }
              assetUtxo = assetUtxos[i];
              if (!(assetUtxo.inscriptions.length > 1)) {
                _context.next = 16;
                break;
              }
              throw new Error(
                'Multiple inscriptions in one UTXO! Please split them first.',
              );
            case 16:
              tx.addInput(assetUtxo);
              tx.addOutput(toAddress, assetUtxo.satoshis);
              toSignInputs.push({
                index: i,
                publicKey: assetUtxo.pubkey,
              });
            case 19:
              i++;
              _context.next = 12;
              break;
            case 22:
              _context.next = 24;
              return tx.addSufficientUtxosForFee(btcUtxos);
            case 24:
              _toSignInputs = _context.sent;
              toSignInputs.push.apply(toSignInputs, _toSignInputs);
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
              });
            case 28:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _sendInscriptions.apply(this, arguments);
}
