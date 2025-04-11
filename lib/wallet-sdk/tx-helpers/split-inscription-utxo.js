import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _regeneratorRuntime from '@babel/runtime/regenerator';
import { UTXO_DUST } from '../constants';
import { ErrorCodes, WalletUtilsError } from '../error';
import {
  InscriptionUnspendOutput,
  Transaction,
  utxoHelper,
} from '../transaction';
export function splitInscriptionUtxo(_x) {
  return _splitInscriptionUtxo.apply(this, arguments);
}
function _splitInscriptionUtxo() {
  _splitInscriptionUtxo = _asyncToGenerator(
    /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(_ref) {
      var btcUtxos,
        assetUtxo,
        networkType,
        changeAddress,
        feeRate,
        _ref$enableRBF,
        enableRBF,
        _ref$outputValue,
        outputValue,
        tx,
        toSignInputs,
        lastUnit,
        splitedCount,
        ordUtxo,
        tmpOutputCounts,
        j,
        unit,
        _toSignInputs,
        psbt;
      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1)
          switch ((_context.prev = _context.next)) {
            case 0:
              (btcUtxos = _ref.btcUtxos),
                (assetUtxo = _ref.assetUtxo),
                (networkType = _ref.networkType),
                (changeAddress = _ref.changeAddress),
                (feeRate = _ref.feeRate),
                (_ref$enableRBF = _ref.enableRBF),
                (enableRBF = _ref$enableRBF === void 0 ? true : _ref$enableRBF),
                (_ref$outputValue = _ref.outputValue),
                (outputValue =
                  _ref$outputValue === void 0 ? 546 : _ref$outputValue);
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
              tx = new Transaction();
              tx.setNetworkType(networkType);
              tx.setFeeRate(feeRate);
              tx.setEnableRBF(enableRBF);
              tx.setChangeAddress(changeAddress);
              toSignInputs = [];
              lastUnit = null;
              splitedCount = 0;
              ordUtxo = new InscriptionUnspendOutput(assetUtxo, outputValue);
              tx.addInput(ordUtxo.utxo);
              toSignInputs.push({
                index: 0,
                publicKey: ordUtxo.utxo.pubkey,
              });
              tmpOutputCounts = 0;
              j = 0;
            case 18:
              if (!(j < ordUtxo.inscriptionUnits.length)) {
                _context.next = 31;
                break;
              }
              unit = ordUtxo.inscriptionUnits[j];
              if (!unit.hasInscriptions()) {
                _context.next = 26;
                break;
              }
              tx.addChangeOutput(unit.satoshis);
              lastUnit = unit;
              tmpOutputCounts++;
              splitedCount++;
              return _context.abrupt('continue', 28);
            case 26:
              tx.addChangeOutput(unit.satoshis);
              lastUnit = unit;
            case 28:
              j++;
              _context.next = 18;
              break;
            case 31:
              if (!lastUnit.hasInscriptions()) {
                tx.removeChangeOutput();
              }
              if (lastUnit.satoshis < UTXO_DUST) {
                lastUnit.satoshis = UTXO_DUST;
              }
              _context.next = 35;
              return tx.addSufficientUtxosForFee(btcUtxos);
            case 35:
              _toSignInputs = _context.sent;
              toSignInputs.push.apply(toSignInputs, _toSignInputs);
              psbt = tx.toPsbt();
              return _context.abrupt('return', {
                psbt: psbt,
                toSignInputs: toSignInputs,
                splitedCount: splitedCount,
              });
            case 39:
            case 'end':
              return _context.stop();
          }
      }, _callee);
    }),
  );
  return _splitInscriptionUtxo.apply(this, arguments);
}
