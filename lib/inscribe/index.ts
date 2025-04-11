export * from './mint';
// export * from './index_back';

import { keys } from '@cmdcode/crypto-tools';

export async function waitSomeSeconds(num: number) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve('');
    }, num);
  });
}

export function createLittleEndianInteger(value: number) {
  // Create a new ArrayBuffer with a size of 4 bytes
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);

  // Set the value as a little endian integer
  view.setUint32(0, value, true);

  // Convert the ArrayBuffer to a hexadecimal string
  let hex = Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Remove trailing zeroes
  hex = hex.replace(/0+$/, '');
  if (hex.length % 2 !== 0) {
    hex += '0';
  }
  return hex;
}

export function serializeInscriptionId(inscriptionId: string) {
  // 将txid反转并转换为字节数组
  const txid = inscriptionId.split('i0')[0];
  const txidBytes = txid
    .match(/.{2}/g)
    ?.reverse()
    .map((byte) => parseInt(byte, 16));

  // // 将index转换为小端序的字节数组
  // const indexBytes = new ArrayBuffer(4);
  // const indexView = new DataView(indexBytes);
  // indexView.setUint32(0, index, true); // true表示使用小端序

  // // 合并txid和index的字节数组，并转换为十六进制字符串
  const txidReverse = txidBytes
    ?.map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return txidReverse;
}

export function removeObjectEmptyValue(obj: any) {
  const _obj = { ...obj };
  Object.keys(_obj).forEach((key) => {
    if (
      _obj[key] === '' ||
      _obj[key] === undefined ||
      _obj[key] === null ||
      _obj[key] === 'null' ||
      _obj[key] === 'undefined' ||
      _obj[key] === 'NaN' ||
      (isNaN(_obj[key]) && typeof _obj[key] === 'number')
    ) {
      delete _obj[key];
    }
  });
  return _obj;
}

export function textToHex(text: string) {
  const encoder = new TextEncoder().encode(text);
  return [...new Uint8Array(encoder)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function encodeBase64(file: File) {
  return new Promise(function (resolve) {
    const imgReader = new FileReader();
    imgReader.onloadend = function () {
      resolve(imgReader?.result?.toString());
    };
    imgReader.readAsDataURL(file);
  });
}

export function arrayBufferToBuffer(ab) {
  const buffer = new Buffer(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

export function fileToArrayBuffer(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const readFile = () => {
      const buffer = reader.result;
      resolve(buffer);
    };

    reader.addEventListener('load', readFile);
    reader.readAsArrayBuffer(file);
  });
}

export function hexString(buffer) {
  const byteArray = new Uint8Array(buffer);
  const hexCodes = [...byteArray].map((value) => {
    return value.toString(16).padStart(2, '0');
  });

  return '0x' + hexCodes.join('');
}

export async function bufferToSha256(buffer) {
  return window.crypto.subtle.digest('SHA-256', buffer);
}

export async function fileToSha256Hex(file: File) {
  const buffer = await fileToArrayBuffer(file);
  const hash = await bufferToSha256(arrayBufferToBuffer(buffer));
  return hexString(hash);
}

export function base64ToHex(str: string) {
  const raw = atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += hex.length === 2 ? hex : '0' + hex;
  }
  return result.toLowerCase();
}

export function bytesToHex(bytes) {
  return bytes.reduce(
    (str, byte) => str + byte.toString(16).padStart(2, '0'),
    '',
  );
}

export function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function generatePrivateKey(): string {
  const privkey = keys.gen_seckey();
  const privString = bytesToHex(privkey);
  return privString;
}

export function hexToBytes(hex) {
  return Uint8Array.from(
    hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
  );
}

export function satsToBitcoin(sats) {
  if (typeof sats === 'string') {
    sats = sats.trim();
  }

  if (isNaN(sats)) {
    throw new Error('Input is not a valid number');
  }

  const satoshis = Number(sats);

  // Ensure the number is non-negative
  if (satoshis < 0) {
    throw new Error('Input must be a non-negative number');
  }

  // Convert Satoshis to BTC
  const btc = satoshis / 1e8;

  return btc;
}

export function clacHexSize(hex: string) {
  const data = hexToBytes(hex);
  const txsize = data.length;
  return txsize;
}

export function clacTextSize(text: string) {
  const data = hexToBytes(textToHex(text));
  const txsize = data.length;
  return txsize;
}
