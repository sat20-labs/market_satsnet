import _asyncToGenerator from '@babel/runtime/helpers/esm/asyncToGenerator';
import _inheritsLoose from '@babel/runtime/helpers/esm/inheritsLoose';
function _createForOfIteratorHelperLoose(o, allowArrayLike) {
  var it =
    (typeof Symbol !== 'undefined' && o[Symbol.iterator]) || o['@@iterator'];
  if (it) return (it = it.call(o)).next.bind(it);
  if (
    Array.isArray(o) ||
    (it = _unsupportedIterableToArray(o)) ||
    (allowArrayLike && o && typeof o.length === 'number')
  ) {
    if (it) o = it;
    var i = 0;
    return function () {
      if (i >= o.length) return { done: true };
      return { done: false, value: o[i++] };
    };
  }
  throw new TypeError(
    'Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.',
  );
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === 'string') return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === 'Object' && o.constructor) n = o.constructor.name;
  if (n === 'Map' || n === 'Set') return Array.from(o);
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n))
    return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
import _regeneratorRuntime from '@babel/runtime/regenerator';
import * as bip39 from 'bip39';
import * as hdkey from 'hdkey';
import { ECPair, bitcoin } from '../bitcoin-core';
import { SimpleKeyring } from './simple-keyring';
var hdPathString = "m/44'/0'/0'/0";
var type = 'HD Key Tree';
export var HdKeyring = /*#__PURE__*/ (function (_SimpleKeyring) {
  _inheritsLoose(HdKeyring, _SimpleKeyring);
  /* PUBLIC METHODS */
  function HdKeyring(opts) {
    var _this;
    _this = _SimpleKeyring.call(this, null) || this;
    _this.type = type;
    _this.mnemonic = null;
    _this.xpriv = null;
    _this.network = bitcoin.networks.bitcoin;
    _this.hdPath = hdPathString;
    _this.root = null;
    _this.wallets = [];
    _this._index2wallet = {};
    _this.activeIndexes = [];
    _this.page = 0;
    _this.perPage = 5;
    if (opts) {
      _this.deserialize(opts);
    }
    return _this;
  }
  var _proto = HdKeyring.prototype;
  _proto.serialize = /*#__PURE__*/ (function () {
    var _serialize = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee() {
        return _regeneratorRuntime.wrap(
          function _callee$(_context) {
            while (1)
              switch ((_context.prev = _context.next)) {
                case 0:
                  return _context.abrupt('return', {
                    mnemonic: this.mnemonic,
                    xpriv: this.xpriv,
                    activeIndexes: this.activeIndexes,
                    hdPath: this.hdPath,
                    passphrase: this.passphrase,
                  });
                case 1:
                case 'end':
                  return _context.stop();
              }
          },
          _callee,
          this,
        );
      }),
    );
    function serialize() {
      return _serialize.apply(this, arguments);
    }
    return serialize;
  })();
  _proto.deserialize = /*#__PURE__*/ (function () {
    var _deserialize = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee2(_opts) {
        var opts;
        return _regeneratorRuntime.wrap(
          function _callee2$(_context2) {
            while (1)
              switch ((_context2.prev = _context2.next)) {
                case 0:
                  if (_opts === void 0) {
                    _opts = {};
                  }
                  if (!this.root) {
                    _context2.next = 3;
                    break;
                  }
                  throw new Error(
                    'Btc-Hd-Keyring: Secret recovery phrase already provided',
                  );
                case 3:
                  opts = _opts;
                  this.wallets = [];
                  this.mnemonic = null;
                  this.xpriv = null;
                  this.root = null;
                  this.hdPath = opts.hdPath || hdPathString;
                  if (opts.passphrase) {
                    this.passphrase = opts.passphrase;
                  }
                  if (opts.mnemonic) {
                    this.initFromMnemonic(opts.mnemonic);
                  } else if (opts.xpriv) {
                    this.initFromXpriv(opts.xpriv);
                  }
                  if (opts.activeIndexes) {
                    this.activeAccounts(opts.activeIndexes);
                  }
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
    function deserialize(_x) {
      return _deserialize.apply(this, arguments);
    }
    return deserialize;
  })();
  _proto.initFromXpriv = function initFromXpriv(xpriv) {
    if (this.root) {
      throw new Error(
        'Btc-Hd-Keyring: Secret recovery phrase already provided',
      );
    }
    this.xpriv = xpriv;
    this._index2wallet = {};
    this.hdWallet = hdkey.fromJSON({
      xpriv: xpriv,
    });
    this.root = this.hdWallet;
  };
  _proto.initFromMnemonic = function initFromMnemonic(mnemonic) {
    if (this.root) {
      throw new Error(
        'Btc-Hd-Keyring: Secret recovery phrase already provided',
      );
    }
    this.mnemonic = mnemonic;
    this._index2wallet = {};
    var seed = bip39.mnemonicToSeedSync(mnemonic, this.passphrase);
    this.hdWallet = hdkey.fromMasterSeed(seed);
    this.root = this.hdWallet.derive(this.hdPath);
  };
  _proto.changeHdPath = function changeHdPath(hdPath) {
    if (!this.mnemonic) {
      throw new Error('Btc-Hd-Keyring: Not support');
    }
    this.hdPath = hdPath;
    this.root = this.hdWallet.derive(this.hdPath);
    var indexes = this.activeIndexes;
    this._index2wallet = {};
    this.activeIndexes = [];
    this.wallets = [];
    this.activeAccounts(indexes);
  };
  _proto.getAccountByHdPath = function getAccountByHdPath(hdPath, index) {
    if (!this.mnemonic) {
      throw new Error('Btc-Hd-Keyring: Not support');
    }
    var root = this.hdWallet.derive(hdPath);
    var child = root.deriveChild(index);
    var ecpair = ECPair.fromPrivateKey(child.privateKey, {
      network: this.network,
    });
    var address = ecpair.publicKey.toString('hex');
    return address;
  };
  _proto.addAccounts = function addAccounts(numberOfAccounts) {
    if (numberOfAccounts === void 0) {
      numberOfAccounts = 1;
    }
    var count = numberOfAccounts;
    var currentIdx = 0;
    var newWallets = [];
    while (count) {
      var _this$_addressFromInd = this._addressFromIndex(currentIdx),
        wallet = _this$_addressFromInd[1];
      if (this.wallets.includes(wallet)) {
        currentIdx++;
      } else {
        this.wallets.push(wallet);
        newWallets.push(wallet);
        this.activeIndexes.push(currentIdx);
        count--;
      }
    }
    var hexWallets = newWallets.map(function (w) {
      return w.publicKey.toString('hex');
    });
    return Promise.resolve(hexWallets);
  };
  _proto.activeAccounts = function activeAccounts(indexes) {
    var accounts = [];
    for (
      var _iterator = _createForOfIteratorHelperLoose(indexes), _step;
      !(_step = _iterator()).done;

    ) {
      var index = _step.value;
      var _this$_addressFromInd2 = this._addressFromIndex(index),
        address = _this$_addressFromInd2[0],
        wallet = _this$_addressFromInd2[1];
      this.wallets.push(wallet);
      this.activeIndexes.push(index);
      accounts.push(address);
    }
    return accounts;
  };
  _proto.getFirstPage = function getFirstPage() {
    this.page = 0;
    return this.__getPage(1);
  };
  _proto.getNextPage = function getNextPage() {
    return this.__getPage(1);
  };
  _proto.getPreviousPage = function getPreviousPage() {
    return this.__getPage(-1);
  };
  _proto.getAddresses = function getAddresses(start, end) {
    var from = start;
    var to = end;
    var accounts = [];
    for (var i = from; i < to; i++) {
      var _this$_addressFromInd3 = this._addressFromIndex(i),
        address = _this$_addressFromInd3[0];
      accounts.push({
        address: address,
        index: i + 1,
      });
    }
    return accounts;
  };
  _proto.__getPage = /*#__PURE__*/ (function () {
    var _getPage = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee3(increment) {
        var from, to, accounts, i, _this$_addressFromInd4, address;
        return _regeneratorRuntime.wrap(
          function _callee3$(_context3) {
            while (1)
              switch ((_context3.prev = _context3.next)) {
                case 0:
                  this.page += increment;
                  if (!this.page || this.page <= 0) {
                    this.page = 1;
                  }
                  from = (this.page - 1) * this.perPage;
                  to = from + this.perPage;
                  accounts = [];
                  for (i = from; i < to; i++) {
                    (_this$_addressFromInd4 = this._addressFromIndex(i)),
                      (address = _this$_addressFromInd4[0]);
                    accounts.push({
                      address: address,
                      index: i + 1,
                    });
                  }
                  return _context3.abrupt('return', accounts);
                case 7:
                case 'end':
                  return _context3.stop();
              }
          },
          _callee3,
          this,
        );
      }),
    );
    function __getPage(_x2) {
      return _getPage.apply(this, arguments);
    }
    return __getPage;
  })();
  _proto.getAccounts = /*#__PURE__*/ (function () {
    var _getAccounts = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee4() {
        return _regeneratorRuntime.wrap(
          function _callee4$(_context4) {
            while (1)
              switch ((_context4.prev = _context4.next)) {
                case 0:
                  return _context4.abrupt(
                    'return',
                    this.wallets.map(function (w) {
                      return w.publicKey.toString('hex');
                    }),
                  );
                case 1:
                case 'end':
                  return _context4.stop();
              }
          },
          _callee4,
          this,
        );
      }),
    );
    function getAccounts() {
      return _getAccounts.apply(this, arguments);
    }
    return getAccounts;
  })();
  _proto.getIndexByAddress = function getIndexByAddress(address) {
    for (var key in this._index2wallet) {
      if (this._index2wallet[key][0] === address) {
        return Number(key);
      }
    }
    return null;
  };
  _proto._addressFromIndex = function _addressFromIndex(i) {
    if (!this._index2wallet[i]) {
      var child = this.root.deriveChild(i);
      var ecpair = ECPair.fromPrivateKey(child.privateKey, {
        network: this.network,
      });
      var address = ecpair.publicKey.toString('hex');
      this._index2wallet[i] = [address, ecpair];
    }
    return this._index2wallet[i];
  };
  return HdKeyring;
})(SimpleKeyring);
HdKeyring.type = type;
