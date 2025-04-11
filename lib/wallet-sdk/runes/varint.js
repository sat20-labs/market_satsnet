import bigInt from 'big-integer';
function try_decode(buf) {
  var n = bigInt(0);
  var m = bigInt(1);
  for (var i = 0; ; i++) {
    if (i >= buf.length) {
      throw new Error('Buffer too short');
    }
    var _byte = bigInt(buf.readUInt8(i));
    n = n.plus(_byte.and(0x7f).multiply(m));
    if (_byte.and(0x80).equals(0)) {
      return [n.toString(), i + 1];
    }
    m = m.shiftLeft(7);
  }
}
function encodeToVec(n, v) {
  var bigint_128 = bigInt(128);
  n = bigInt(n);
  while (n.gt(bigint_128)) {
    v.push(n.and(0x7f).or(0x80).toJSNumber());
    n = n.divide(bigint_128);
  }
  v.push(n.toJSNumber());
}
function decode(buffer) {
  var ret = try_decode(buffer);
  return {
    num: ret[0],
    index: ret[1],
  };
}
function encode(n) {
  var v = [];
  encodeToVec(n, v);
  return Buffer.from(new Uint8Array(v));
}
export var varint = {
  encode: encode,
  decode: decode,
  try_decode: try_decode,
  encodeToVec: encodeToVec,
};
