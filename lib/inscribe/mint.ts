import { Address, Signer, Tap, Tx, Script } from '@cmdcode/tapscript';
import * as cbor from 'cbor-web';
import {
  buildTransaction,
  filterUtxosByValue,
  bitcoin,
  toPsbtNetwork,
  NetworkType,
} from '@/lib/wallet';
import { signAndPushPsbt } from '@/lib/utils/btc';
import { flat, sum } from 'radash';
import { keys } from '@cmdcode/crypto-utils';
import i18n from '@/locales';
import { WIFWallet } from '@/lib/inscribe/WIFWallet';
const crypto = require('crypto');
import {
  textToHex,
  encodeBase64,
  base64ToHex,
  hexToBytes,
  fileToSha256Hex,
  serializeInscriptionId,
  createLittleEndianInteger,
} from './index';
import { useUtxoStore } from '@/store';

import { ordx } from '@/api';

interface FileItem {
  mimetype: string;
  show: string;
  name: string;
  originValue: string;
  hex: string;
  amt?: number;
  offset?: number;
  op?: string;
  relateInscriptionId?: string;
  type: string;
  sha256: string;
  fileHex: string;
  fileName: string;
  fileMimeType: string;
  txsize: number;
  ordxType?: string;
  parent?: string;
  parentHex?: string;
  parentMimeType?: string;
}
interface InscriptionItem {
  script: any;
  leaf: any;
  tapkey: string;
  cblock: string;
  inscriptionAddress: string;
  txsize: number;
  status: 'pending';
  txid: '';
  file: FileItem;
}

export const generateSeed = (ranges) => {
  const _ranges = ranges.map((v) => {
    return {
      start: v.start,
      size: v.size,
    };
  });
  const jsonString = JSON.stringify(_ranges);
  try {
    const bytes = new TextEncoder().encode(jsonString);
    const hash = crypto.createHash('sha256');
    hash.update(bytes);
    const hashResult = hash.digest('hex').slice(0, 16);
    return hashResult;
  } catch (error) {
    console.error('json.Marshal failed. ' + error);
    return '0';
  }
};
export const selectAmountRangesByUtxos = (utxos: any[], amount) => {
  const sats: any[] = flat(utxos.map((v) => v.sats));
  const ranges: any[] = [];
  let totalSize = 0;
  for (let i = 0; i < sats.length; i++) {
    const item = sats[i];
    const { size, start } = item;
    totalSize += size;

    if (totalSize > amount) {
      const dis = totalSize - amount;
      ranges.push({
        start,
        size: size - dis,
      });
    } else {
      ranges.push({
        start,
        size,
      });
    }
  }
  return ranges;
};
export const splitUtxosByValue = (
  utxos: any[],
  amount: number,
  chunks: number,
) => {
  const sats: any[] = flat(utxos.map((v) => v.sats));
  let ranges: any[] = [];
  const totalRanges: any[][] = [];
  let totalSize = 0;
  for (let i = 0; i < sats.length; i++) {
    const item = sats[i];
    const { size, start } = item;
    console.log(start, size);
    totalSize += size;
    if (totalSize > amount && totalRanges.length < chunks) {
      const dis = totalSize - amount;
      const others = size - dis;
      console.log(dis, others);
      ranges.push({
        start,
        size: others,
      });
      totalRanges.push(ranges);
      if (dis < amount) {
        ranges = [
          {
            start: start + others,
            size: dis,
          },
        ];
        totalSize = dis;
      } else {
        const othersChunks = Math.floor(dis / amount);
        const othersDis = dis % amount;
        for (let j = 0; j < othersChunks; j++) {
          if (totalRanges.length < chunks) {
            totalRanges.push([
              {
                start: start + others + j * amount,
                size: amount,
              },
            ]);
          }
        }
        if (othersDis > 0) {
          if (totalRanges.length < chunks) {
            ranges = [
              {
                start: start + others + othersChunks * amount,
                size: othersDis,
              },
            ];
            totalSize = othersDis;
          }
        }
      }
    } else if (totalRanges.length < chunks) {
      ranges.push({
        start,
        size,
      });
    }
  }
  return totalRanges;
};
export const splitRareUtxosByValue = (utxos: any[], amount: number) => {
  const sats: any[] = flat(utxos.map((v) => v.sats));
  let ranges: any[] = [];
  const totalRanges: any[][] = [];
  let totalSize = 0;
  for (let i = 0; i < sats.length; i++) {
    const item = sats[i];
    console.log('index', i);
    const { size, start, offset } = item;
    totalSize += size;
    if (totalSize > amount) {
      const dis = totalSize - amount;
      const others = size - dis;
      ranges.push({
        start,
        size: others,
        offset,
      });
      totalRanges.push(ranges);
      if (dis < amount) {
        ranges = [
          {
            start: start + others,
            size: dis,
            offset: offset + others,
          },
        ];
        totalSize = dis;
      } else {
        const othersChunks = Math.floor(dis / amount);
        const othersDis = dis % amount;
        for (let j = 0; j < othersChunks; j++) {
          totalRanges.push([
            {
              start: start + others + j * amount,
              size: amount,
              offset: offset + others + j * amount,
            },
          ]);
          ranges = [];
          totalSize = 0;
        }
        if (othersDis > 0) {
          console.log(start);
          console.log(start + others + othersChunks * amount);
          ranges = [
            {
              start: start + others + othersChunks * amount,
              size: othersDis,
              offset: offset + others + othersChunks * amount,
            },
          ];
          totalSize = othersDis;
        }
      }
    } else {
      ranges.push({
        start,
        size,
        offset,
      });
    }
  }
  if (ranges.length > 0) {
    totalRanges.push(ranges);
  }
  return totalRanges;
};
export const generateSeedByUtxos = (utxos: any[], amount) => {
  amount = Math.max(amount, 546);
  return generateSeed(selectAmountRangesByUtxos(utxos, amount));
};
export const generateRuneFiles = async (list: any[]) => {
  const files: any[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (item.action === 'etch') {
      const file = {
        type: item.type,
        action: item.action,
        runeName: item.runeName,
        amount: item.amount,
        show: `Etching ${item.runeName}`,
        cap: item.cap,
        symbol: item.symbol,
        divisibility: item.divisibility,
        premine: item.premine,
      };
      files.push(file);
    } else {
      const file = {
        type: item.type,
        action: item.action,
        runeId: item.runeId,
        runeName: item.runeName,
        amount: item.amount,
        show: `${item.runeName} (${item.amount})`,
      };
      files.push(file);
    }
    
  }
  return files;
};
export const generteFiles = async (list: any[]) => {
  const files: any[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const { type, value, name, ordxType, utxos, isSpecial, amount, offset } =
      item;
    const file: any = {
      type,
      name,
      originValue: value,
      ordxType,
      isSpecial,
      amount,
      offset,
      utxos,
    };
    if (type === 'text') {
      const _value = value?.trim();
      file.mimetype = 'text/plain;charset=utf-8';
      file.show = _value;
      file.hex = textToHex(_value);
      file.sha256 = '';
    } else if (type === 'brc20') {
      file.mimetype = 'text/plain;charset=utf-8';
      file.show = value;
      file.hex = textToHex(value);
      file.sha256 = '';
    } else if (type === 'ordx_name') {
      file.mimetype = 'text/plain;charset=utf-8';
      try {
        const parseData = JSON.parse(value);
        file.show = parseData.name || value;
      } catch (error) {
        file.show = value;
      }
      file.hex = textToHex(value);
      file.sha256 = '';
    } else if (type === 'ordx') {
      file.mimetype = 'text/plain;charset=utf-8';
      file.show = value[0];
      file.originValue = value[0];
      file.hex = textToHex(value[0]);
      if (value.length > 1) {
        const fileData = value.find((v) => v.type === 'file');
        if (ordxType === 'mint') {
          file.parent = fileData?.value;
          file.parentHex = textToHex(fileData?.value);
          file.parentMimeType = fileData?.mimeType;
        } else {
          file.fileHex = fileData?.value;
          file.fileMimeType = fileData?.mimeType;
          file.fileName = fileData?.name;
          file.show += `;${fileData?.name}`;
        }
        const relateData = value.find((v) => v.type === 'relateInscriptionId');
        if (relateData) {
          file.relateInscriptionId = relateData.value;
        }
      }
      file.sha256 = '';
      const ordxData = JSON.parse(value[0]);
      file.amt = Number(ordxData.amt);
      file.op = ordxData.op;
    } else if (type === 'file') {
      let mimetype = value.type?.trim();
      if (mimetype.includes('text/plain')) {
        mimetype += ';charset=utf-8';
      }
      const b64 = (await encodeBase64(value)) as string;
      const base64 = b64.substring(b64.indexOf('base64,') + 7);
      const hex = base64ToHex(base64);
      file.mimetype = mimetype;
      file.show = name;
      const sha256 = await fileToSha256Hex(value);
      file.sha256 = sha256.replace('0x', '');
      file.hex = hex;
    }
    // let prefix = 160;

    // if (file.sha256 != '') {
    //   prefix = 546;
    // }
    const contentBytes = hexToBytes(file.hex);

    let txsize = Math.floor(23 + contentBytes.length / 4);
    if (type === 'ordx' && ordxType === 'deploy' && file.fileHex) {
      const contentFileBytes = hexToBytes(file.fileHex);
      txsize += Math.floor(contentFileBytes.length / 4);
    } else if (type === 'ordx' && ordxType === 'mint' && file.parentHex) {
      const parentContentBytes = hexToBytes(file.parentHex);
      txsize += Math.floor(parentContentBytes.length / 4);
    }
    file.txsize = txsize;
    files.push(file);
  }
  return files;
};
/**
 * `generateBrc20MintContent` 函数用于创建 BRC-20 代币铸币操作的 JSON 字符串，其中包括指定的参数。
 * @param {string} tick - `generateBrc20MintContent` 函数中的 `tick` 参数是一个字符串，表示正在处理的交易的唯一标识符或引用。它可以是代币 ID、交易 ID 或与铸币操作上下文相关的任何其他标识符。
 * @param {number} amt - `generateBrc20MintContent` 函数中的 `amt` 参数表示要铸造的代币数量。它是一个数字，指定了铸币过程中要创建的代币的数量。
 * @param {string} [protocol=brc-20] - `generateBrc20MintContent` 函数中的 `protocol` 参数是一个字符串，用于指定正在使用的协议。在这种情况下，`protocol` 参数的默认值设置为 'brc-20'。
 * @returns `generateBrc20MintContent` 函数返回一个包含指定协议、操作、代币 tick 和金额值的 JSON 字符串。这些值使用模板字符串和函数参数格式化为字符串。
 */
export const generateBrc20MintContent = (
  tick: string,
  amt: number,
  protocol: string = 'brc-20',
): string => {
  const text = `{"p":"${protocol}","op":"mint","tick":"${tick}","amt":"${Math.floor(
    amt,
  )}"}`;
  return text;
};

export const getFundingAddress = (sescet: string, network: string) => {
  const seckey = keys.get_seckey(sescet);
  const pubkey = keys.get_pubkey(seckey, true);
  const script = [pubkey, 'OP_CHECKSIG'];
  const leaf = Tap.encodeScript(script);
  const [tapkey, cblock] = Tap.getPubKey(pubkey, { target: leaf });
  const address = Address.p2tr.fromPubKey(tapkey, network as any);
  return {
    script,
    leaf,
    tapkey,
    cblock,
    address,
  };
};
export const getAddressBySescet = (sescet: string, network: string) => {
  const seckey = keys.get_seckey(sescet);
  const pubkey = keys.get_pubkey(seckey, true);
  return Address.p2tr.fromPubKey(pubkey, network as any);
};

export const generateMultiScript = (
  secret: string,
  files: FileItem[],
  meta: any,
) => {
  const seckey = keys.get_seckey(secret);
  const pubkey = keys.get_pubkey(seckey, true);
  const ec = new TextEncoder();
  // const content = hexToBytes(file.hex);
  // const mimetype = ec.encode(file.mimetype);
  let script: any = [];
  const startScript = [pubkey, 'OP_CHECKSIG'];
  if (
    meta.type === 'ordx' &&
    meta.ordxType === 'deploy' &&
    meta.hasDeployFile
  ) {
    files.forEach((file) => {
      const fileContent = hexToBytes(file.fileHex);
      const fileMimeType = ec.encode(file.fileMimeType);
      const metaData = cbor.encode(JSON.parse(file.originValue));
      script.push(
        ...[
          'OP_0',
          'OP_IF',
          ec.encode('ord'),
          '01',
          fileMimeType,
          '07',
          ec.encode('ordx'),
          '05',
          metaData,
          'OP_0',
          fileContent,
          'OP_ENDIF',
        ],
      );
    });
  } else if (meta.type === 'ordx' && meta.ordxType === 'mint') {
    files.forEach((file, i) => {
      const content = hexToBytes(file.hex);
      const mimetype = ec.encode(file.mimetype);
      if (file.parent) {
        const parentMimeType = ec.encode(file.parentMimeType);
        const parentConent = hexToBytes(file.parentHex);
        const metaData = cbor.encode(JSON.parse(file.originValue));
        const offset = file.offset || 0;
        script.push(
          ...['OP_0', 'OP_IF', ec.encode('ord'), '01', parentMimeType],
        );
        if (offset > 0) {
          script.push(...['02', createLittleEndianInteger(offset)]);
        }
        script.push(
          ...[
            '07',
            ec.encode('ordx'),
            '05',
            metaData,
            'OP_0',
            parentConent,
            'OP_ENDIF',
          ],
        );
      } else if (file.relateInscriptionId) {
        const offset = file.offset || 0;
        const detaConent = serializeInscriptionId(file.relateInscriptionId);
        const originValue: any = JSON.parse(file.originValue);
        const meteData: any = originValue;
        const edcodeMetaData = cbor.encode(meteData);
        script.push(...['OP_0', 'OP_IF', ec.encode('ord')]);
        if (offset > 0) {
          if (createLittleEndianInteger(offset) === '28a') {
            console.log(i);
          }
          script.push(...['02', createLittleEndianInteger(offset)]);
        }
        script.push(
          ...[
            '07',
            ec.encode('ordx'),
            '05',
            edcodeMetaData,
            '0B',
            detaConent,
            'OP_ENDIF',
          ],
        );
      } else {
        const offset = file?.offset || 0;
        script.push(...['OP_0', 'OP_IF', ec.encode('ord'), '01', mimetype]);
        if (offset > 0) {
          script.push(...['02', createLittleEndianInteger(offset)]);
        }
        script.push(...['OP_0', content, 'OP_ENDIF']);
      }
    });
  } else if (meta.type === 'blog') {
    const file = files[0];
    const detaConent = serializeInscriptionId(meta.relateInscriptionId);
    const offset = file.offset || 0;
    const edcodeMetaData = cbor.encode(meta.blogMetadata);
    script.push(...['OP_0', 'OP_IF', ec.encode('ord')]);
    if (offset > 0) {
      script.push(...['02', createLittleEndianInteger(offset)]);
    }
    script.push(
      ...[
        '07',
        ec.encode('sns'),
        '05',
        edcodeMetaData,
        '0B',
        detaConent,
        'OP_ENDIF',
      ],
    );
  } else {
    files.forEach((file) => {
      const content = hexToBytes(file.hex);
      const mimetype = ec.encode(file.mimetype);
      const offset = file.offset || 0;
      script.push(...['OP_0', 'OP_IF', ec.encode('ord'), '01', mimetype]);
      if (offset > 0) {
        script.push(...['02', createLittleEndianInteger(offset)]);
      }
      script.push(...['OP_0', content, 'OP_ENDIF']);
    });
  }
  script = [...startScript, ...script];
  console.log('script', script);
  return script;
};
/*
铭刻过程
*/
export const generateInscription = ({
  files,
  secret,
  network = 'main',
  metadata,
}: {
  files: FileItem[];
  feeRate: number;
  secret: string;
  network: any;
  metadata: any;
}) => {
  let inscription: any;
  const seckey = keys.get_seckey(secret);
  const pubkey = keys.get_pubkey(seckey, true);
  const script = generateMultiScript(secret, files, metadata);
  const leaf = Tap.encodeScript(script);
  const [tapkey, cblock] = Tap.getPubKey(pubkey, { target: leaf });
  console.log('leaf:', Script.encode(script));
  const inscriptionAddress = Address.p2tr.fromPubKey(tapkey, network);
  console.log('network:', network);
  console.log('Inscription address: ', inscriptionAddress);
  console.log('Tapkey:', tapkey);
  let txsize = 0;
  txsize = 64 + 33 + Script.encode(script).length;
  inscription = {
    // script: script,
    leaf: leaf,
    tapkey: tapkey,
    cblock: cblock,
    inscriptionAddress: inscriptionAddress,
    txsize: txsize,
    status: 'pending',
    txid: '',
  };
  return inscription;
};
export const returnInscribe = async ({
  inscription,
  network,
  txid,
  vout,
  amount,
  feeRate,
  networkFee,
  fromAddress,
  secret,
  files,
  metadata,
}: any) => {
  const seckey = keys.get_seckey(secret);
  const pubkey = keys.get_pubkey(seckey, true);
  const { cblock, tapkey, leaf } = inscription;
  // const gasFee = (180 + 34 + 10) * feeRate;
  const outputs = [
    {
      // We are leaving behind 1000 sats as a fee to the miners.
      value: Math.floor(
        amount - networkFee + (34 * files.length - 1) * feeRate,
      ),
      // This is the new script that we are locking our funds to.
      scriptPubKey: Address.toScriptPubKey(fromAddress),
    },
  ];

  const txdata = Tx.create({
    vin: [
      {
        // Use the txid of the funding transaction used to send the sats.
        txid: txid,
        // Specify the index value of the output that you are going to spend from.
        vout: vout,
        // Also include the value and script of that ouput.
        prevout: {
          // Feel free to change this if you sent a different amount.
          value: amount,
          // This is what our address looks like in script form.
          scriptPubKey: ['OP_1', tapkey],
        },
      },
    ],
    vout: outputs,
  });
  const sig = Signer.taproot.sign(seckey, txdata, 0, { extension: leaf });
  const script = generateMultiScript(secret, files, metadata);

  // Add the signature to our witness data for input 0, along with the script
  // and merkle proof (cblock) for the script.
  txdata.vin[0].witness = [sig, script, cblock];
  console.log('Your txhex:', txdata);
  const isValid = Signer.taproot.verify(txdata, 0, { pubkey, throws: true });
  console.log('isValid', isValid);
  console.log('Your txhex:', Tx.encode(txdata).hex);
  const result = await ordx.pushTx({ hex: Tx.encode(txdata).hex, network });
  return result;
};
interface InscribeParams {
  inscription: InscriptionItem;
  txid: string;
  vout: number;
  oneUtxo: boolean;
  tight: boolean;
  amount: number;
  files: any[];
  serviceFee?: number;
  secret: any;
  metadata: any;
  toAddresses: string[];
  network: 'main' | 'testnet';
}

/**
 * The `inscribe` function in TypeScript handles the creation and signing of a transaction for a
 * specific network with various parameters and outputs.
 * @param {InscribeParams}  - The `inscribe` function takes in several parameters to create and
 * broadcast a transaction on the blockchain. Here is a breakdown of each parameter:
 * @returns The `inscribe` function is returning the result of pushing the transaction to the network
 * using `ordx.pushTx({ hex: Tx.encode(txdata).hex, network })`.
 */
export const inscribe = async ({
  inscription,
  network,
  txid,
  vout,
  amount,
  oneUtxo,
  tight,
  toAddresses,
  secret,
  files,
  metadata,
}: InscribeParams) => {
  const seckey = keys.get_seckey(secret);
  const pubkey = keys.get_pubkey(seckey, true);
  const { cblock, tapkey, leaf } = inscription;

  let outputs = files.map((f, i) => {
    const toAddress =
      toAddresses?.length === 1 ? toAddresses[0] : toAddresses[i];
    return {
      value: f.amount,
      scriptPubKey: Address.toScriptPubKey(toAddress),
    };
  });
  const totalInscription = files.reduce((acc, cur) => acc + cur.amount, 0);
  if (oneUtxo || tight) {
    outputs = [
      {
        value: Math.max(330, totalInscription),
        scriptPubKey: Address.toScriptPubKey(toAddresses[0]),
      },
    ];
  }
  const txdata = Tx.create({
    vin: [
      {
        // Use the txid of the funding transaction used to send the sats.
        txid: txid,
        // Specify the index value of the output that you are going to spend from.
        vout: vout,
        // Also include the value and script of that ouput.
        prevout: {
          // Feel free to change this if you sent a different amount.
          value: amount,
          // This is what our address looks like in script form.
          scriptPubKey: ['OP_1', tapkey],
        },
      },
    ],
    vout: outputs,
  });
  console.log('Your txhex:', txdata);

  const sig = Signer.taproot.sign(seckey, txdata, 0, { extension: leaf });
  const script = generateMultiScript(secret, files, metadata);

  // Add the signature to our witness data for input 0, along with the script
  // and merkle proof (cblock) for the script.
  txdata.vin[0].witness = [sig, script, cblock];
  console.log('Your txhex:', txdata);
  const isValid = Signer.taproot.verify(txdata, 0, { pubkey, throws: true });
  console.log('isValid', isValid);
  console.log('Your txhex:', Tx.encode(txdata).hex);
  const result = await ordx.pushTx({ hex: Tx.encode(txdata).hex, network });
  return result;
};

export const pushCommitTx = async ({
  inscriptions,
  secret,
  network,
  serviceFee,
  funding,
  inscriptionSize,
  feeRate,
}: any) => {
  const tipAddress =
    network === 'testnet'
      ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
      : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;
  const seckey = keys.get_seckey(secret);
  const pubkey = keys.get_pubkey(seckey, true);
  const outputs = inscriptions.map((item) => {
    return {
      value: inscriptionSize + feeRate * item.txsize,
      scriptPubKey: ['OP_1', item.tapkey],
    };
  });
  // if (outputs.length > 10) {
  //   outputs = outputs.slice(1);
  // }
  if (serviceFee && tipAddress) {
    outputs.push({
      value: serviceFee,
      scriptPubKey: Address.toScriptPubKey(tipAddress),
    });
  }
  console.log('funcding amount', funding.amount);
  console.log('commit outputs', outputs);
  const commitTxData = Tx.create({
    vin: [
      {
        txid: funding.txid,
        vout: funding.vout,
        prevout: {
          value: funding.amount,
          scriptPubKey: ['OP_1', funding.tapkey],
        },
      },
    ],
    vout: outputs,
  });
  const sig = Signer.taproot.sign(seckey, commitTxData, 0, {
    extension: funding.leaf,
  });
  commitTxData.vin[0].witness = [sig, funding.script, funding.cblock];
  const isValid = Signer.taproot.verify(commitTxData, 0, {
    pubkey,
    throws: true,
  });
  console.log('commit Tx isValid', isValid);
  const rawtx = Tx.encode(commitTxData).hex;
  console.log('Your Commit Tx txhex:', rawtx);
  const txid = await ordx.pushTx({ hex: rawtx, network });
  const result = {
    txid,
    outputs: outputs.map((item, i) => {
      return {
        vout: i,
        amount: item.value,
      };
    }),
  };
  return result;
};

interface SendBTCProps {
  toAddress: string;
  network: string;
  value: number;
  feeRate: number;
  isSpecial?: boolean;
  serviceFee?: number;
  fromAddress: string;
  fromPubKey: string;
  ordxUtxo?: any;
  specialAmt?: number;
  utxos?: any[];
}

export const generateSendBtcPsbt = async ({
  utxos,
  outputs,
  address,
  feeRate,
  network,
  publicKey,
}) => {
  console.log('outputs', outputs);

  const psbt = await buildTransaction({
    utxos: utxos,
    outputs,
    feeRate,
    network,
    address,
    publicKey,
    suitable: true,
  });
  return psbt;
};
export const sendBtcPsbt = async (psbt, fromAddress) => {
  const { add: addUtxo, removeUtxos } = useUtxoStore.getState();
  console.log('psbt', psbt);
  console.log(psbt.toHex());

  const txId = await signAndPushPsbt(psbt);
  if (psbt.txOutputs.length > 1) {
    const sliceOutputs = psbt.txOutputs.slice(1);
    sliceOutputs.forEach((output, index) => {
      if (output.address === fromAddress) {
        addUtxo({
          utxo: `${txId}:${index + 1}`,
          value: output.value,
          status: 'unspend',
          location: 'local',
          sort: 1,
          txid: txId,
          vout: index + 1,
        });
      }
    });
  }
  // removeUtxos(avialableUtxos);
  return txId;
};
