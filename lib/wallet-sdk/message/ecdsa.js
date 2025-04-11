import { bitcore } from '../bitconre';
export function signMessageOfECDSA(privateKey, text) {
  var keyPair = privateKey;
  var message = new bitcore.Message(text);
  return message.sign(new bitcore.PrivateKey(keyPair.privateKey));
}
export function verifyMessageOfECDSA(publicKey, text, sig) {
  var message = new bitcore.Message(text);
  var signature = bitcore.crypto.Signature.fromCompact(
    Buffer.from(sig, 'base64'),
  );
  var hash = message.magicHash();

  // recover the public key
  var ecdsa = new bitcore.crypto.ECDSA();
  ecdsa.hashbuf = hash;
  ecdsa.sig = signature;
  var pubkeyInSig = ecdsa.toPublicKey();
  var pubkeyInSigString = new bitcore.PublicKey(
    Object.assign({}, pubkeyInSig.toObject(), {
      compressed: true,
    }),
  ).toString();
  if (pubkeyInSigString != publicKey) {
    return false;
  }
  return bitcore.crypto.ECDSA.verify(hash, signature, pubkeyInSig);
}
