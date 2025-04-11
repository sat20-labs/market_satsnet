import bigInt from 'big-integer';
export var RuneId = /*#__PURE__*/ (function () {
  function RuneId(_ref) {
    var block = _ref.block,
      tx = _ref.tx;
    this.block = block;
    this.tx = tx;
  }
  RuneId.fromBigInt = function fromBigInt(n) {
    var bigN = bigInt(n);
    var block = bigN.shiftRight(16);
    var tx = bigN.and(0xffff);
    if (
      block.greater(Number.MAX_SAFE_INTEGER) ||
      tx.greater(Number.MAX_SAFE_INTEGER)
    ) {
      throw new Error('Integer overflow');
    }
    return new RuneId({
      block: block.toJSNumber(),
      tx: tx.toJSNumber(),
    });
  };
  var _proto = RuneId.prototype;
  _proto.toString = function toString() {
    return this.block + ':' + this.tx;
  };
  RuneId.fromString = function fromString(s) {
    var _s$split$map = s.split(':').map(Number),
      block = _s$split$map[0],
      tx = _s$split$map[1];
    return new RuneId({
      block: block,
      tx: tx,
    });
  };
  return RuneId;
})();
