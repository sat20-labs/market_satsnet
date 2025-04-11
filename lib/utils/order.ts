import { addresToScriptPublicKey } from '../wallet/utils';
import { btcToSats } from '@/lib/utils';
import { parseUtxo } from './btc';
import { tryit } from 'radash';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
import { SIGHASH_SINGLE_ANYONECANPAY, DUMMY_UTXO_VALUE } from '@/lib/constants';
import {
  bitcoin,
  toPsbtNetwork,
  NetworkType,
  buildTransaction,
  Transaction,
  convertUtxosToBtcUtxos,
  generateTransaction,
  PsbtInput,
} from '../wallet';
import { UtxoAssetItem } from '@/store';
import { clientApi, bulkBuyingThirdOrder } from '@/api';
interface SellOrderProps {
  inscriptionUtxo: {
    txid: string;
    vout: number;
    value: number;
  };
  total: number;
  amount: number;
  network: string;
  address: string;
}

interface BatchSellOrderProps {
  inscriptionUtxos: UtxoAssetItem[];
  network: string;
  address: string;
  unit: string;
  chain: string;
}

interface DisplayAsset {
  // Assuming DisplayAsset has properties that are not specified in the given context
  // Placeholder properties for demonstration
  id: string;
  name: string;
}

interface AssetsInUtxo {
  UtxoId: number;
  OutPoint: string; // tx:vout
  Value: number;
  PkScript: Uint8Array;
  Assets: DisplayAsset[];
}

interface SellUtxoInfo {
  AssetsInUtxo: AssetsInUtxo;
  Price: number; // 价格
  AssetInfo?: {
    // Assuming AssetInfo has properties that are not specified in the given context
    // Placeholder properties for demonstration
    id: string;
    name: string;
  }; // 不指定时，直接使用输入的Asset的资产信息
}

export async function buildBatchSellOrder({
  inscriptionUtxos,
  network,
  address,
  unit,
  chain,
}: BatchSellOrderProps) {
  console.log(
    'build batch sell order params',
    inscriptionUtxos,
    network,
    address,
  );
  const psbtNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );
  const batchSell = new bitcoin.Psbt({
    network: psbtNetwork,
  });
  if (chain === 'btc') {
    for (let i = 0; i < inscriptionUtxos.length; i++) {
      const { utxo, price } = inscriptionUtxos[i];
      console.log(utxo, price);
      const { txid, vout } = parseUtxo(utxo);
      const [error, rawTx] = await tryit(clientApi.getTxRaw)(txid);
      if (error) {
        throw error;
      }
      const [error2, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);
      if (error2) {
        throw error2;
      }
      console.log('utxoInfo', utxoInfo);

      const ordinalPreTx = bitcoin.Transaction.fromHex(rawTx.data);
      console.log(ordinalPreTx);
      const utxoInput = {
        hash: txid,
        index: vout,
        witnessUtxo: ordinalPreTx.outs[vout],
        sighashType: SIGHASH_SINGLE_ANYONECANPAY,
      };
      batchSell.addInput(utxoInput);
      batchSell.addOutput({
        address,
        value: unit === 'btc' ? btcToSats(price) : Number(price),
      });
    }
    console.log(batchSell);
    return batchSell.toHex();
  } else {
    const sellUtxoInfos: SellUtxoInfo[] = [];
    for (let i = 0; i < inscriptionUtxos.length; i++) {
      const { utxo, price } = inscriptionUtxos[i];
      const [error2, utxoInfo] = await tryit(clientApi.getUtxoInfo)(utxo);
      if (error2) {
        throw error2;
      }
      sellUtxoInfos.push({
        ...utxoInfo.data,
        Price: unit === 'btc' ? btcToSats(price) : Number(price),
      });
    }
    const sat20SellOrder = await window.sat20.buildBatchSellOrder(
      sellUtxoInfos.map((v) => JSON.stringify(v)),
      address,
      network,
    );
    const psbt = sat20SellOrder?.data?.psbt;
    if (!psbt) {
      throw new Error('Failed to build sat20 sell order');
    }
    return psbt;
  }
}

export async function buildTransferPsbt({
  inscriptionUtxos,
  utxos,
  oneOutput,
  addresses,
  feeRate,
}: any) {
  const { btcWallet, network, address, publicKey } =
    useReactWalletStore.getState();

  const len = inscriptionUtxos.length;
  let toAddress: any[] = [];

  if (addresses.length === 1) {
    toAddress = Array.from({ length: len }).fill(addresses[0]);
  } else {
    toAddress = addresses.slice(0, len);
  }
  const inputUtxoss: any[] = [];
  const outputs: any[] = [];
  let totalValue = 0;
  for (let i = 0; i < len; i++) {
    const item = inscriptionUtxos[i];
    const [txid, vout] = item.utxo.split(':');
    inputUtxoss.push({
      txid,
      vout: parseInt(vout),
      value: item.value,
    });
    totalValue += item.value;
    if (!oneOutput) {
      outputs.push({
        address: toAddress[i],
        value: item.value,
      });
    }
  }
  if (oneOutput) {
    outputs.push({
      address: toAddress[0],
      value: totalValue,
    });
  }

  inputUtxoss.push(...utxos);

  const psbt = await buildTransaction({
    utxos: inputUtxoss,
    outputs,
    feeRate,
    network,
    address,
    publicKey,
    suitable: true,
  });
  return psbt;
}
export async function generateTransferPsbt({
  inscriptionUtxos,
  utxos,
  oneOutput,
  addresses,
  feeRate,
}: any) {
  const { btcWallet, network, address, publicKey } =
    useReactWalletStore.getState();

  const len = inscriptionUtxos.length;
  let toAddress: any[] = [];

  if (addresses.length === 1) {
    toAddress = Array.from({ length: len }).fill(addresses[0]);
  } else {
    toAddress = addresses.slice(0, len);
  }
  const inputUtxoss: any[] = [];
  const outputs: any[] = [];
  let totalValue = 0;
  for (let i = 0; i < len; i++) {
    const item = inscriptionUtxos[i];
    const [txid, vout] = item.utxo.split(':');
    inputUtxoss.push({
      txid,
      vout: parseInt(vout),
      value: item.value,
    });
    totalValue += item.value;
    if (!oneOutput) {
      outputs.push({
        address: toAddress[i],
        value: item.value,
      });
    }
  }
  if (oneOutput) {
    outputs.push({
      address: toAddress[0],
      value: totalValue,
    });
  }

  inputUtxoss.push(...utxos);

  const tx = await generateTransaction({
    utxos: inputUtxoss,
    outputs,
    feeRate,
    network,
    address,
    publicKey,
    suitable: true,
  });
  return tx;
}
export const splitBatchSignedPsbt = async (
  signedHex: string,
  network: string,
  chain: string,
) => {
  console.log('split batch signed psbt', signedHex);
  if (chain === 'btc') {
    const psbtNetwork = toPsbtNetwork(
      network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
    );
    const psbt = bitcoin.Psbt.fromHex(signedHex, {
      network: psbtNetwork,
    });
    const { inputCount } = psbt;
    const newPsbts: string[] = [];
    for (let i = 0; i < inputCount; i++) {
      const newPsbt = new bitcoin.Psbt({
        network: psbtNetwork,
      });
      const batchInput: any = {
        hash: psbt.txInputs[i].hash as any,
        index: psbt.txInputs[i].index,
        witnessUtxo: psbt.data.inputs[i].witnessUtxo as any,
      };
      if (psbt.data.inputs[i].finalScriptWitness) {
        batchInput.finalScriptWitness = psbt.data.inputs[i].finalScriptWitness;
      }
      const batchOutput = psbt.txOutputs[i];
      newPsbt.addInput(batchInput);
      newPsbt.addOutput(batchOutput);
      newPsbts.push(newPsbt.toHex());
    }
    return newPsbts;
  } else {
    const res = await window.sat20.splitBatchSignedPsbt(signedHex, network);
    const psbts = res?.data?.psbts;
    if (!psbts || psbts.length === 0) {
      throw new Error('Failed to split sat20 sell order');
    }
    return psbts;
  }
};

interface BuyOrderProps {
  orderId: string;
  orderRaw: string;
  feeRate: number;
  serviceFee: number;
  address: string;
  network: string;
  utxos: any[];
  dummyUtxos: any[];
  fee: number;
}
export const buildDummyUtxos = async ({ utxos, feeRate, num = 2 }) => {
  const { btcWallet, publicKey, address, network } =
    useReactWalletStore.getState();
  const outputs: any = [];
  for (let i = 0; i < num; i++) {
    outputs.push({
      address,
      value: DUMMY_UTXO_VALUE,
    });
  }
  const psbt = await buildTransaction({
    utxos,
    outputs,
    feeRate,
    network,
    address,
    publicKey,
  });
  let dummyUtxos: any[] = [];
  let balanceUtxo: any = {};
  const signed = await btcWallet?.signPsbt(psbt.toHex());
  if (signed) {
    let txid = await btcWallet?.pushPsbt(signed);
    if (txid) {
      try {
        txid = JSON.parse(txid);
      } catch (error) {
        console.log(error);
      }
    }
    for (let i = 0; i < num; i++) {
      dummyUtxos.push({
        txid,
        vout: 0,
        value: DUMMY_UTXO_VALUE,
      });
    }
    balanceUtxo = {
      txid,
      vout: psbt.txOutputs.length - 1,
      value: psbt.txOutputs[psbt.txOutputs.length - 1].value,
    };
  }
  console.log(dummyUtxos);
  console.log(balanceUtxo);
  return {
    balanceUtxo,
    dummyUtxos,
  };
};
export const buildBuyThirdOrder = async ({ order_ids, fee_rate_tier }: any) => {
  const { btcWallet, network, address, publicKey } =
    useReactWalletStore.getState();
  const thirdRes = await bulkBuyingThirdOrder({
    address,
    publickey: publicKey,
    order_ids,
    fee_rate_tier,
    receiver_address: address,
  });
  const psbtNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );
  if (thirdRes?.code === 200 && btcWallet && thirdRes.data) {
    const buyRaw = thirdRes.data;
    const signed = await btcWallet.signPsbt(buyRaw);
    console.log('signed', signed);
    // const txid = await btcWallet.pushPsbt(signed);
    // console.log('buy order txid', txid);
    const psbt = bitcoin.Psbt.fromHex(signed!, {
      network: psbtNetwork,
    });

    const tx = psbt.extractTransaction();
    const rawTxHex = tx.toHex();
    return rawTxHex;
  } else {
    throw new Error(thirdRes?.msg || 'Failed to build third order');
  }
};
export const buildBuyOrder = async ({
  raws,
  utxos,
  serviceFee,
  feeRate,
  dummyUtxos,
}: any) => {
  const { btcWallet, network, address, publicKey } =
    useReactWalletStore.getState();
  const NEXT_PUBLIC_SERVICE_FEE = process.env.NEXT_PUBLIC_SERVICE_FEE;
  const NEXT_PUBLIC_SERVICE_ADDRESS =
    network === 'testnet'
      ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
      : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;

  const psbtNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );

  const btcUtxos = convertUtxosToBtcUtxos({
    utxos,
    address,
    publicKey,
  });
  const dummyInputs: any[] = dummyUtxos.map((v) => {
    return {
      hash: v.txid,
      index: v.vout,
      witnessUtxo: {
        script: Buffer.from(addresToScriptPublicKey(address), 'hex'),
        value: v.value,
      },
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    };
  });

  const psbtTx = new Transaction({
    address,
    network: network == 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
    feeRate,
  });
  console.log(btcUtxos);
  psbtTx.setEnableRBF(false);
  dummyInputs.forEach((v) => {
    psbtTx.addPsbtInput(v);
  });

  const sellInputs: PsbtInput[] = [];
  const sellOutputs: any[] = [];
  const buyOutputs: any[] = [];
  for (let i = 0; i < raws.length; i++) {
    const { raw } = raws[i];
    const sellPsbt = bitcoin.Psbt.fromHex(raw, {
      network: psbtNetwork,
    });
    const sellerInput = {
      hash: sellPsbt.txInputs[0].hash as any,
      index: sellPsbt.txInputs[0].index,
      witnessUtxo: sellPsbt.data.inputs[0].witnessUtxo as any,
      finalScriptWitness: sellPsbt.data.inputs[0].finalScriptWitness,
    };
    console.log(sellerInput);
    sellInputs.push(sellerInput);
    const ordValue = sellPsbt.data.inputs[0].witnessUtxo!.value;
    const ordOutput = {
      address,
      value: ordValue,
    };
    sellOutputs.push(ordOutput);
    const sellerOutput = sellPsbt.txOutputs[0];
    buyOutputs.push(sellerOutput);
  }
  sellInputs.forEach((i) => {
    psbtTx.addPsbtInput(i);
  });

  const dummyTotal = dummyUtxos.reduce((a, b) => a + b.value, 0);
  psbtTx.addOutput(address, dummyTotal);

  sellOutputs.forEach((v) => {
    psbtTx.addOutput(v.address, v.value);
  });

  buyOutputs.forEach((v) => {
    psbtTx.addOutput(v.address, v.value, v.script);
  });

  if (serviceFee && NEXT_PUBLIC_SERVICE_FEE && NEXT_PUBLIC_SERVICE_ADDRESS) {
    psbtTx.addOutput(NEXT_PUBLIC_SERVICE_ADDRESS, serviceFee);
  }
  for (let i = 0; i < dummyUtxos.length; i++) {
    psbtTx.addOutput(address, DUMMY_UTXO_VALUE);
  }
  await psbtTx.addSufficientUtxosForFee(btcUtxos, {
    suitable: true,
  });
  console.log(psbtTx);
  const buyPsbt = psbtTx.toPsbt();
  console.log(buyPsbt);
  if (!btcWallet) {
    throw new Error('Wallet not initialized');
  }
  console.log('buy psbt hex', buyPsbt.toHex());
  console.log('buy psbt base64', buyPsbt.toBase64());

  const signed = await btcWallet.signPsbt(buyPsbt.toHex());
  console.log('signed', signed);
  // const txid = await btcWallet.pushPsbt(signed);
  // console.log('buy order txid', txid);
  const psbt = bitcoin.Psbt.fromHex(signed!, {
    network: psbtNetwork,
  });

  const tx = psbt.extractTransaction();
  console.log(tx);
  const rawTxHex = tx.toHex();
  return rawTxHex;
};

export const generateBuyInputsAndOutputs = async ({
  raws,
  dummyUtxos,
}: any) => {
  const { network, address } = useReactWalletStore.getState();
  const psbtNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );
  const dummyInputs: any[] = dummyUtxos.map((v) => {
    return {
      hash: v.txid,
      index: v.vout,
      witnessUtxo: {
        script: Buffer.from(addresToScriptPublicKey(address), 'hex'),
        value: v.value,
      },
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    };
  });
  const sellInputs: PsbtInput[] = [];
  const sellOutputs: any[] = [];
  const buyOutputs: any[] = [];
  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i];
    const sellPsbt = bitcoin.Psbt.fromHex(raw, {
      network: psbtNetwork,
    });

    const sellerInput = {
      hash: sellPsbt.txInputs[0].hash as any,
      index: sellPsbt.txInputs[0].index,
      witnessUtxo: sellPsbt.data.inputs[0].witnessUtxo as any,
      finalScriptWitness: sellPsbt.data.inputs[0].finalScriptWitness,
    };

    sellInputs.push(sellerInput);
    const ordValue = sellPsbt.data.inputs[0].witnessUtxo!.value;
    const ordOutput = {
      address,
      value: ordValue,
    };
    sellOutputs.push(ordOutput);
    const sellerOutput = sellPsbt.txOutputs[0];
    buyOutputs.push(sellerOutput);
  }
  const inputs = [...sellInputs];
  const outputs = [...sellOutputs, ...buyOutputs];
  return {
    inputs,
    outputs,
    dummyInputs,
  };
};
export const calcBuyOrderFee = async ({
  raws,
  utxos,
  serviceFee,
  feeRate,
  dummyUtxos,
}: any) => {
  const { btcWallet, network, address, publicKey } =
    useReactWalletStore.getState();
  const NEXT_PUBLIC_SERVICE_FEE = process.env.NEXT_PUBLIC_SERVICE_FEE;
  const NEXT_PUBLIC_SERVICE_ADDRESS =
    network === 'testnet'
      ? process.env.NEXT_PUBLIC_SERVICE_TESTNET_ADDRESS
      : process.env.NEXT_PUBLIC_SERVICE_ADDRESS;

  const psbtNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );

  const btcUtxos = convertUtxosToBtcUtxos({
    utxos,
    address,
    publicKey,
  });
  const dummyInputs: any[] = dummyUtxos.map((v) => {
    return {
      hash: v.txid,
      index: v.vout,
      witnessUtxo: {
        script: Buffer.from(addresToScriptPublicKey(address), 'hex'),
        value: v.value,
      },
      sighashType: bitcoin.Transaction.SIGHASH_ALL,
    };
  });

  const psbtTx = new Transaction({
    address,
    network: network == 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
    feeRate,
  });
  psbtTx.setEnableRBF(false);
  dummyInputs.forEach((v) => {
    psbtTx.addPsbtInput(v);
  });

  const sellInputs: PsbtInput[] = [];
  const sellOutputs: any[] = [];
  const buyOutputs: any[] = [];
  for (let i = 0; i < raws.length; i++) {
    const { raw } = raws[i];
    const sellPsbt = bitcoin.Psbt.fromHex(raw, {
      network: psbtNetwork,
    });

    const sellerInput = {
      hash: sellPsbt.txInputs[0].hash as any,
      index: sellPsbt.txInputs[0].index,
      witnessUtxo: sellPsbt.data.inputs[0].witnessUtxo as any,
      finalScriptWitness: sellPsbt.data.inputs[0].finalScriptWitness,
    };

    sellInputs.push(sellerInput);
    const ordValue = sellPsbt.data.inputs[0].witnessUtxo!.value;
    const ordOutput = {
      address,
      value: ordValue,
    };
    sellOutputs.push(ordOutput);
    const sellerOutput = sellPsbt.txOutputs[0];
    buyOutputs.push(sellerOutput);
  }
  sellInputs.forEach((i) => {
    psbtTx.addPsbtInput(i);
  });

  const dummyTotal = dummyUtxos.reduce((a, b) => a + b.value, 0);
  psbtTx.addOutput(address, dummyTotal);

  sellOutputs.forEach((v) => {
    psbtTx.addOutput(v.address, v.value);
  });

  buyOutputs.forEach((v) => {
    psbtTx.addOutput(v.address, v.value, v.script);
  });

  if (serviceFee && NEXT_PUBLIC_SERVICE_FEE && NEXT_PUBLIC_SERVICE_ADDRESS) {
    psbtTx.addOutput(NEXT_PUBLIC_SERVICE_ADDRESS, serviceFee);
  }
  for (let i = 0; i < dummyUtxos.length; i++) {
    psbtTx.addOutput(address, DUMMY_UTXO_VALUE);
  }
  await psbtTx.addSufficientUtxosForFee(btcUtxos, {
    suitable: false,
  });
  console.log(psbtTx);
  return await psbtTx.calNetworkFee();
};
