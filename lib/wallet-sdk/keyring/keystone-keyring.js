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
import { EventEmitter } from 'events';
import { bitcore } from '../bitconre';
import KeystoneSDK, { KeystoneBitcoinSDK, UR } from '@keystonehq/keystone-sdk';
import { verifyMessageOfECDSA } from '../message';
import { uuid } from '@keystonehq/keystone-sdk/dist/utils';
import { Psbt } from 'bitcoinjs-lib';
var type = 'Keystone';
export var KeystoneKeyring = /*#__PURE__*/ (function (_EventEmitter) {
  _inheritsLoose(KeystoneKeyring, _EventEmitter);
  function KeystoneKeyring(opts) {
    var _this;
    _this = _EventEmitter.call(this) || this;
    _this.type = type;
    _this.mfp = '';
    _this.keys = [];
    _this.activeIndexes = [];
    _this.root = null;
    _this.page = 0;
    _this.perPage = 5;
    _this.origin = 'UniSat Wallet';
    if (opts) {
      _this.deserialize(opts);
    }
    return _this;
  }
  var _proto = KeystoneKeyring.prototype;
  _proto.initFromUR = /*#__PURE__*/ (function () {
    var _initFromUR = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee(type, cbor) {
        var keystoneSDK, account;
        return _regeneratorRuntime.wrap(
          function _callee$(_context) {
            while (1)
              switch ((_context.prev = _context.next)) {
                case 0:
                  keystoneSDK = new KeystoneSDK({
                    origin: this.origin,
                  });
                  account = keystoneSDK.parseAccount(
                    new UR(Buffer.from(cbor, 'hex'), type),
                  );
                  _context.next = 4;
                  return this.deserialize({
                    mfp: account.masterFingerprint,
                    keys: account.keys.map(function (k) {
                      return {
                        path: k.path,
                        extendedPublicKey: k.extendedPublicKey,
                      };
                    }),
                  });
                case 4:
                case 'end':
                  return _context.stop();
              }
          },
          _callee,
          this,
        );
      }),
    );
    function initFromUR(_x, _x2) {
      return _initFromUR.apply(this, arguments);
    }
    return initFromUR;
  })();
  _proto.getHardenedPath = function getHardenedPath(hdPath) {
    var paths = hdPath.split('/');
    return paths.slice(0, 4).join('/');
  };
  _proto.getHDPublicKey = function getHDPublicKey(hdPath) {
    var path = this.getHardenedPath(hdPath);
    var key = this.keys.find(function (v) {
      return v.path === path;
    });
    if (!key) {
      throw new Error('Invalid path');
    }
    return new bitcore.HDPublicKey(key.extendedPublicKey);
  };
  _proto.getDefaultHdPath = function getDefaultHdPath() {
    return "m/44'/0'/0'/0";
  };
  _proto.initRoot = function initRoot() {
    var _this$hdPath;
    this.root = this.getHDPublicKey(
      (_this$hdPath = this.hdPath) != null
        ? _this$hdPath
        : this.getDefaultHdPath(),
    );
  };
  _proto.deserialize = /*#__PURE__*/ (function () {
    var _deserialize = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee2(opts) {
        var _opts$hdPath;
        return _regeneratorRuntime.wrap(
          function _callee2$(_context2) {
            while (1)
              switch ((_context2.prev = _context2.next)) {
                case 0:
                  this.mfp = opts.mfp;
                  this.keys = opts.keys;
                  this.hdPath =
                    (_opts$hdPath = opts.hdPath) != null
                      ? _opts$hdPath
                      : this.getDefaultHdPath();
                  this.activeIndexes = opts.activeIndexes
                    ? [].concat(opts.activeIndexes)
                    : [];
                  this.initRoot();
                  if (
                    opts.hdPath !== null &&
                    opts.hdPath !== undefined &&
                    opts.hdPath.length >= 13 &&
                    opts.hdPath[opts.hdPath.length - 1] === '1'
                  ) {
                    this.root = this.root.derive('m/1');
                  }
                case 6:
                case 'end':
                  return _context2.stop();
              }
          },
          _callee2,
          this,
        );
      }),
    );
    function deserialize(_x3) {
      return _deserialize.apply(this, arguments);
    }
    return deserialize;
  })();
  _proto.serialize = /*#__PURE__*/ (function () {
    var _serialize = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee3() {
        return _regeneratorRuntime.wrap(
          function _callee3$(_context3) {
            while (1)
              switch ((_context3.prev = _context3.next)) {
                case 0:
                  return _context3.abrupt('return', {
                    mfp: this.mfp,
                    keys: this.keys,
                    hdPath: this.hdPath,
                    activeIndexes: this.activeIndexes,
                  });
                case 1:
                case 'end':
                  return _context3.stop();
              }
          },
          _callee3,
          this,
        );
      }),
    );
    function serialize() {
      return _serialize.apply(this, arguments);
    }
    return serialize;
  })();
  _proto.addAccounts = /*#__PURE__*/ (function () {
    var _addAccounts = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(
        function _callee4(numberOfAccounts) {
          var count, i, pubkeys, w;
          return _regeneratorRuntime.wrap(
            function _callee4$(_context4) {
              while (1)
                switch ((_context4.prev = _context4.next)) {
                  case 0:
                    if (numberOfAccounts === void 0) {
                      numberOfAccounts = 1;
                    }
                    count = numberOfAccounts;
                    i = 0;
                    pubkeys = [];
                    while (count) {
                      if (this.activeIndexes.includes(i)) {
                        i++;
                      } else {
                        w = this.getWalletByIndex(i);
                        pubkeys.push(w.publicKey);
                        this.activeIndexes.push(i);
                        count--;
                      }
                    }
                    return _context4.abrupt('return', Promise.resolve(pubkeys));
                  case 6:
                  case 'end':
                    return _context4.stop();
                }
            },
            _callee4,
            this,
          );
        },
      ),
    );
    function addAccounts(_x4) {
      return _addAccounts.apply(this, arguments);
    }
    return addAccounts;
  })();
  _proto.addChangeAddressAccounts = /*#__PURE__*/ (function () {
    var _addChangeAddressAccounts = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(
        function _callee5(numberOfAccounts) {
          var count, i, pubkeys, w;
          return _regeneratorRuntime.wrap(
            function _callee5$(_context5) {
              while (1)
                switch ((_context5.prev = _context5.next)) {
                  case 0:
                    if (numberOfAccounts === void 0) {
                      numberOfAccounts = 1;
                    }
                    count = numberOfAccounts;
                    i = 0;
                    pubkeys = [];
                    while (count) {
                      if (this.activeIndexes.includes(i)) {
                        i++;
                      } else {
                        w = this.getChangeAddressWalletByIndex(i);
                        pubkeys.push(w.publicKey);
                        this.activeIndexes.push(i);
                        count--;
                      }
                    }
                    return _context5.abrupt('return', Promise.resolve(pubkeys));
                  case 6:
                  case 'end':
                    return _context5.stop();
                }
            },
            _callee5,
            this,
          );
        },
      ),
    );
    function addChangeAddressAccounts(_x5) {
      return _addChangeAddressAccounts.apply(this, arguments);
    }
    return addChangeAddressAccounts;
  })();
  _proto.getAccounts = /*#__PURE__*/ (function () {
    var _getAccounts = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee6() {
        var _this2 = this;
        return _regeneratorRuntime.wrap(
          function _callee6$(_context6) {
            while (1)
              switch ((_context6.prev = _context6.next)) {
                case 0:
                  if (
                    !(
                      this.hdPath !== null &&
                      this.hdPath !== undefined &&
                      this.hdPath.length >= 13 &&
                      this.hdPath[this.hdPath.length - 1] === '1'
                    )
                  ) {
                    _context6.next = 2;
                    break;
                  }
                  return _context6.abrupt(
                    'return',
                    this.activeIndexes.map(function (index) {
                      var child = _this2.root.derive('m/' + index);
                      return child.publicKey.toString('hex');
                    }),
                  );
                case 2:
                  return _context6.abrupt(
                    'return',
                    this.activeIndexes.map(function (i) {
                      return _this2.getWalletByIndex(i).publicKey;
                    }),
                  );
                case 3:
                case 'end':
                  return _context6.stop();
              }
          },
          _callee6,
          this,
        );
      }),
    );
    function getAccounts() {
      return _getAccounts.apply(this, arguments);
    }
    return getAccounts;
  })();
  _proto.getAccounts2 = /*#__PURE__*/ (function () {
    var _getAccounts2 = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee7() {
        var _this3 = this;
        return _regeneratorRuntime.wrap(
          function _callee7$(_context7) {
            while (1)
              switch ((_context7.prev = _context7.next)) {
                case 0:
                  return _context7.abrupt(
                    'return',
                    this.activeIndexes.map(function (index) {
                      var child = _this3.root.derive('m/' + index);
                      return {
                        index: index,
                        path: _this3.hdPath + '/' + index,
                        publicKey: child.publicKey.toString('hex'),
                      };
                    }),
                  );
                case 1:
                case 'end':
                  return _context7.stop();
              }
          },
          _callee7,
          this,
        );
      }),
    );
    function getAccounts2() {
      return _getAccounts2.apply(this, arguments);
    }
    return getAccounts2;
  })();
  _proto.getAccountsWithBrand = /*#__PURE__*/ (function () {
    var _getAccountsWithBrand = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee8() {
        var _this4 = this;
        return _regeneratorRuntime.wrap(
          function _callee8$(_context8) {
            while (1)
              switch ((_context8.prev = _context8.next)) {
                case 0:
                  return _context8.abrupt(
                    'return',
                    this.activeIndexes.map(function (i) {
                      var w = _this4.getWalletByIndex(i);
                      return {
                        address: w.publicKey,
                        index: i,
                      };
                    }),
                  );
                case 1:
                case 'end':
                  return _context8.stop();
              }
          },
          _callee8,
          this,
        );
      }),
    );
    function getAccountsWithBrand() {
      return _getAccountsWithBrand.apply(this, arguments);
    }
    return getAccountsWithBrand;
  })();
  _proto.getWalletByIndex = function getWalletByIndex(index) {
    var child = this.root.derive('m/0/' + index);
    return {
      index: index,
      path: this.hdPath + '/' + index,
      publicKey: child.publicKey.toString('hex'),
    };
  };
  _proto.getChangeAddressWalletByIndex = function getChangeAddressWalletByIndex(
    index,
  ) {
    var child = this.root.derive('m/1/' + index);
    return {
      index: index,
      path: this.hdPath + '/' + index,
      publicKey: child.publicKey.toString('hex'),
    };
  };
  _proto.removeAccount = function removeAccount(publicKey) {
    var _this5 = this;
    var index = this.activeIndexes.findIndex(function (i) {
      var w = _this5.getWalletByIndex(i);
      return w.publicKey === publicKey;
    });
    if (index !== -1) {
      this.activeIndexes.splice(index, 1);
    }
  };
  _proto.exportAccount = /*#__PURE__*/ (function () {
    var _exportAccount = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee9(_publicKey) {
        return _regeneratorRuntime.wrap(function _callee9$(_context9) {
          while (1)
            switch ((_context9.prev = _context9.next)) {
              case 0:
                throw new Error('Not supported');
              case 1:
              case 'end':
                return _context9.stop();
            }
        }, _callee9);
      }),
    );
    function exportAccount(_x6) {
      return _exportAccount.apply(this, arguments);
    }
    return exportAccount;
  })();
  _proto.getFirstPage = function getFirstPage() {
    this.page = 0;
    return this.getPage(1);
  };
  _proto.getNextPage = function getNextPage() {
    return this.getPage(1);
  };
  _proto.getPreviousPage = function getPreviousPage() {
    return this.getPage(-1);
  };
  _proto.getAddresses = function getAddresses(start, end) {
    var from = start;
    var to = end;
    var accounts = [];
    for (var i = from; i < to; i++) {
      var w = this.getWalletByIndex(i);
      accounts.push({
        address: w.publicKey,
        index: i + 1,
      });
    }
    return accounts;
  };
  _proto.getPage = /*#__PURE__*/ (function () {
    var _getPage = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee10(increment) {
        var from, to, accounts, i, w;
        return _regeneratorRuntime.wrap(
          function _callee10$(_context10) {
            while (1)
              switch ((_context10.prev = _context10.next)) {
                case 0:
                  this.page += increment;
                  if (!this.page || this.page <= 0) {
                    this.page = 1;
                  }
                  from = (this.page - 1) * this.perPage;
                  to = from + this.perPage;
                  accounts = [];
                  for (i = from; i < to; i++) {
                    w = this.getWalletByIndex(i);
                    accounts.push({
                      address: w.publicKey,
                      index: i + 1,
                    });
                  }
                  return _context10.abrupt('return', accounts);
                case 7:
                case 'end':
                  return _context10.stop();
              }
          },
          _callee10,
          this,
        );
      }),
    );
    function getPage(_x7) {
      return _getPage.apply(this, arguments);
    }
    return getPage;
  })();
  _proto.activeAccounts = function activeAccounts(indexes) {
    var accounts = [];
    for (
      var _iterator = _createForOfIteratorHelperLoose(indexes), _step;
      !(_step = _iterator()).done;

    ) {
      var index = _step.value;
      var w = this.getWalletByIndex(index);
      if (!this.activeIndexes.includes(index)) {
        this.activeIndexes.push(index);
      }
      accounts.push(w.publicKey);
    }
    return accounts;
  };
  _proto.changeHdPath = function changeHdPath(hdPath) {
    this.hdPath = hdPath;
    this.initRoot();
    this.activeAccounts(this.activeIndexes);
  };
  _proto.changeChangeAddressHdPath = function changeChangeAddressHdPath(
    hdPath,
  ) {
    var _this$hdPath2;
    this.hdPath = hdPath;
    // this.initRoot()
    this.root = this.getHDPublicKey(
      (_this$hdPath2 = this.hdPath) != null
        ? _this$hdPath2
        : this.getDefaultHdPath(),
    );
    this.root = this.root.derive('m/1');
    this.activeIndexes = [];
    var accounts = [];
    for (
      var _iterator2 = _createForOfIteratorHelperLoose(this.activeIndexes),
        _step2;
      !(_step2 = _iterator2()).done;

    ) {
      var index = _step2.value;
      var w = this.getChangeAddressWalletByIndex(index);
      if (!this.activeIndexes.includes(index)) {
        this.activeIndexes.push(index);
      }
      accounts.push(w.publicKey);
    }
    return accounts;
  };
  _proto.getAccountByHdPath = function getAccountByHdPath(hdPath, index) {
    if (hdPath === "m/44'/0'/0'/1") {
      var _root = this.getHDPublicKey(hdPath);
      var _child = _root.derive('m/1/' + index);
      return _child.publicKey.toString('hex');
    }
    var root = this.getHDPublicKey(hdPath);
    var child = root.derive('m/0/' + index);
    return child.publicKey.toString('hex');
  };
  _proto.getChangeAddressAccountByHdPath =
    function getChangeAddressAccountByHdPath(hdPath, index) {
      var root = this.getHDPublicKey(hdPath);
      var child = root.derive('m/1/' + index);
      return child.publicKey.toString('hex');
    };
  _proto.genSignPsbtUr = /*#__PURE__*/ (function () {
    var _genSignPsbtUr = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee11(psbtHex) {
        var psbt, keystoneSDK, ur;
        return _regeneratorRuntime.wrap(
          function _callee11$(_context11) {
            while (1)
              switch ((_context11.prev = _context11.next)) {
                case 0:
                  psbt = Psbt.fromHex(psbtHex);
                  keystoneSDK = new KeystoneSDK({
                    origin: this.origin,
                  });
                  ur = keystoneSDK.btc.generatePSBT(psbt.data.toBuffer());
                  return _context11.abrupt('return', {
                    type: ur.type,
                    cbor: ur.cbor.toString('hex'),
                  });
                case 4:
                case 'end':
                  return _context11.stop();
              }
          },
          _callee11,
          this,
        );
      }),
    );
    function genSignPsbtUr(_x8) {
      return _genSignPsbtUr.apply(this, arguments);
    }
    return genSignPsbtUr;
  })();
  _proto.parseSignPsbtUr = /*#__PURE__*/ (function () {
    var _parseSignPsbtUr = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee12(type, cbor) {
        var keystoneSDK;
        return _regeneratorRuntime.wrap(
          function _callee12$(_context12) {
            while (1)
              switch ((_context12.prev = _context12.next)) {
                case 0:
                  keystoneSDK = new KeystoneSDK({
                    origin: this.origin,
                  });
                  return _context12.abrupt(
                    'return',
                    keystoneSDK.btc.parsePSBT(
                      new UR(Buffer.from(cbor, 'hex'), type),
                    ),
                  );
                case 2:
                case 'end':
                  return _context12.stop();
              }
          },
          _callee12,
          this,
        );
      }),
    );
    function parseSignPsbtUr(_x9, _x10) {
      return _parseSignPsbtUr.apply(this, arguments);
    }
    return parseSignPsbtUr;
  })();
  _proto.genSignMsgUr = /*#__PURE__*/ (function () {
    var _genSignMsgUr = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(
        function _callee13(publicKey, text) {
          var _this6 = this;
          var keystoneSDK, i, requestId, ur;
          return _regeneratorRuntime.wrap(
            function _callee13$(_context13) {
              while (1)
                switch ((_context13.prev = _context13.next)) {
                  case 0:
                    keystoneSDK = new KeystoneSDK({
                      origin: this.origin,
                    });
                    i = this.activeIndexes.find(function (i) {
                      return _this6.getWalletByIndex(i).publicKey === publicKey;
                    });
                    if (!(i === undefined)) {
                      _context13.next = 4;
                      break;
                    }
                    throw new Error('publicKey not found');
                  case 4:
                    requestId = uuid.v4();
                    ur = keystoneSDK.btc.generateSignRequest({
                      requestId: requestId,
                      signData: Buffer.from(text).toString('hex'),
                      dataType: KeystoneBitcoinSDK.DataType.message,
                      accounts: [
                        {
                          path: this.hdPath + '/' + i,
                          xfp: this.mfp,
                        },
                      ],
                      origin: this.origin,
                    });
                    return _context13.abrupt('return', {
                      requestId: requestId,
                      type: ur.type,
                      cbor: ur.cbor.toString('hex'),
                    });
                  case 7:
                  case 'end':
                    return _context13.stop();
                }
            },
            _callee13,
            this,
          );
        },
      ),
    );
    function genSignMsgUr(_x11, _x12) {
      return _genSignMsgUr.apply(this, arguments);
    }
    return genSignMsgUr;
  })();
  _proto.parseSignMsgUr = /*#__PURE__*/ (function () {
    var _parseSignMsgUr = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(function _callee14(type, cbor) {
        var keystoneSDK;
        return _regeneratorRuntime.wrap(
          function _callee14$(_context14) {
            while (1)
              switch ((_context14.prev = _context14.next)) {
                case 0:
                  keystoneSDK = new KeystoneSDK({
                    origin: this.origin,
                  });
                  return _context14.abrupt(
                    'return',
                    keystoneSDK.btc.parseSignature(
                      new UR(Buffer.from(cbor, 'hex'), type),
                    ),
                  );
                case 2:
                case 'end':
                  return _context14.stop();
              }
          },
          _callee14,
          this,
        );
      }),
    );
    function parseSignMsgUr(_x13, _x14) {
      return _parseSignMsgUr.apply(this, arguments);
    }
    return parseSignMsgUr;
  })();
  _proto.signMessage = /*#__PURE__*/ (function () {
    var _signMessage = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(
        function _callee15(publicKey, text) {
          return _regeneratorRuntime.wrap(function _callee15$(_context15) {
            while (1)
              switch ((_context15.prev = _context15.next)) {
                case 0:
                  return _context15.abrupt(
                    'return',
                    'Signing Message with Keystone should use genSignMsgUr and parseSignMsgUr',
                  );
                case 1:
                case 'end':
                  return _context15.stop();
              }
          }, _callee15);
        },
      ),
    );
    function signMessage(_x15, _x16) {
      return _signMessage.apply(this, arguments);
    }
    return signMessage;
  })();
  _proto.verifyMessage = /*#__PURE__*/ (function () {
    var _verifyMessage = _asyncToGenerator(
      /*#__PURE__*/ _regeneratorRuntime.mark(
        function _callee16(publicKey, text, sig) {
          return _regeneratorRuntime.wrap(function _callee16$(_context16) {
            while (1)
              switch ((_context16.prev = _context16.next)) {
                case 0:
                  return _context16.abrupt(
                    'return',
                    verifyMessageOfECDSA(publicKey, text, sig),
                  );
                case 1:
                case 'end':
                  return _context16.stop();
              }
          }, _callee16);
        },
      ),
    );
    function verifyMessage(_x17, _x18, _x19) {
      return _verifyMessage.apply(this, arguments);
    }
    return verifyMessage;
  })();
  return KeystoneKeyring;
})(EventEmitter);
KeystoneKeyring.type = type;
