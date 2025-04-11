import _assertThisInitialized from '@babel/runtime/helpers/esm/assertThisInitialized';
import _inheritsLoose from '@babel/runtime/helpers/esm/inheritsLoose';
import _wrapNativeSuper from '@babel/runtime/helpers/esm/wrapNativeSuper';
var _ErrorMessages;
export var ErrorCodes = /*#__PURE__*/ (function (ErrorCodes) {
  ErrorCodes[(ErrorCodes['UNKNOWN'] = -1)] = 'UNKNOWN';
  ErrorCodes[(ErrorCodes['INSUFFICIENT_BTC_UTXO'] = -2)] =
    'INSUFFICIENT_BTC_UTXO';
  ErrorCodes[(ErrorCodes['INSUFFICIENT_ASSET_UTXO'] = -3)] =
    'INSUFFICIENT_ASSET_UTXO';
  ErrorCodes[(ErrorCodes['NOT_SAFE_UTXOS'] = -4)] = 'NOT_SAFE_UTXOS';
  ErrorCodes[(ErrorCodes['ASSET_MAYBE_LOST'] = -5)] = 'ASSET_MAYBE_LOST';
  return ErrorCodes;
})({});
export var ErrorMessages =
  ((_ErrorMessages = {}),
  (_ErrorMessages[ErrorCodes.UNKNOWN] = 'Unknown error'),
  (_ErrorMessages[ErrorCodes.INSUFFICIENT_BTC_UTXO] = 'Insufficient btc utxo'),
  (_ErrorMessages[ErrorCodes.INSUFFICIENT_ASSET_UTXO] =
    'Insufficient asset utxo'),
  (_ErrorMessages[ErrorCodes.NOT_SAFE_UTXOS] = 'Not safe utxos'),
  (_ErrorMessages[ErrorCodes.ASSET_MAYBE_LOST] = 'Asset maybe lost'),
  _ErrorMessages);
export var WalletUtilsError = /*#__PURE__*/ (function (_Error) {
  _inheritsLoose(WalletUtilsError, _Error);
  function WalletUtilsError(code, message) {
    var _this;
    if (message === void 0) {
      message = ErrorMessages[code] || 'Unknown error';
    }
    _this = _Error.call(this, message) || this;
    _this.code = ErrorCodes.UNKNOWN;
    _this.code = code;
    Object.setPrototypeOf(
      _assertThisInitialized(_this),
      WalletUtilsError.prototype,
    );
    return _this;
  }
  return WalletUtilsError;
})(/*#__PURE__*/ _wrapNativeSuper(Error));
