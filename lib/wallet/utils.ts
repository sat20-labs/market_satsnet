import { Transaction, NetworkType } from '.';
import { type Utxo, UnspentOutput, PsbtInput, PsbtOutput } from './utxo';
import {
  converUtxosToInputs,
  convertUtxosToBtcUtxos,
  convertBtcUtxosToInputs,
} from './utxo';
import { Address, Script } from '@cmdcode/tapscript';
import * as bitcoin from 'bitcoinjs-lib';

export function addresToScriptPublicKey(address: string) {
  const scriptPublicKey = Script.fmt.toAsm(
    Address.toScriptPubKey(address),
  )?.[0];
  return scriptPublicKey;
}

export function isTaprootAddress(address, network = 'mainnet') {
  try {
    // 通过 bitcoinjs-lib 检查
    const decoded = bitcoin.address.fromBech32(address);
    const isBech32m =
      (decoded.prefix === 'bc' && network !== 'testnet') ||
      (decoded.prefix === 'tb' && network === 'testnet');
    const isVersion1 = decoded.version === 1;

    console.log(isBech32m);
    console.log(isVersion1);
    return isBech32m && isVersion1;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function calcNetworkFee({
  utxos,
  outputs,
  feeRate,
  network,
  address,
  publicKey,
  suitable = true,
}: {
  utxos: Utxo[];
  outputs: PsbtOutput[];
  feeRate: number;
  network: string;
  address: string;
  publicKey: string;
  suitable?: boolean;
}) {
  const btcUtxos = convertUtxosToBtcUtxos({
    utxos,
    address,
    publicKey,
  });
  const tx = new Transaction({
    address,
    network: network == 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
    feeRate,
  });
  tx.setEnableRBF(true);

  outputs.forEach((v) => {
    tx.addOutput(v.address, v.value, v.script);
  });
  console.log(btcUtxos);
  await tx.addSufficientUtxosForFee(btcUtxos, {
    suitable,
  });
  const fee = await tx.calNetworkFee();
  return fee;
}

export async function buildTransaction({
  utxos,
  outputs,
  feeRate,
  network,
  address,
  publicKey,
  suitable = true,
}: {
  utxos: Utxo[];
  outputs: PsbtOutput[];
  feeRate: number;
  network: string;
  address: string;
  publicKey: string;
  suitable?: boolean;
}) {
  const btcUtxos = convertUtxosToBtcUtxos({
    utxos,
    address,
    publicKey,
  });

  const tx = new Transaction({
    address,
    network: network == 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
    feeRate,
  });
  console.log(outputs);
  tx.setEnableRBF(true);

  outputs.forEach((v) => {
    tx.addOutput(v.address, v.value, v.script);
  });
  await tx.addSufficientUtxosForFee(btcUtxos, {
    suitable,
  });

  const psbt = tx.toPsbt();
  return psbt;
}

export async function generateTransaction({
  utxos,
  outputs,
  feeRate,
  network,
  address,
  publicKey,
  suitable = true,
}: {
  utxos: Utxo[];
  outputs: PsbtOutput[];
  feeRate: number;
  network: string;
  address: string;
  publicKey: string;
  suitable?: boolean;
}) {
  const btcUtxos = convertUtxosToBtcUtxos({
    utxos,
    address,
    publicKey,
  });

  const tx = new Transaction({
    address,
    network: network == 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
    feeRate,
  });
  console.log(btcUtxos);
  tx.setEnableRBF(true);

  outputs.forEach((v) => {
    tx.addOutput(v.address, v.value, v.script);
  });
  await tx.addSufficientUtxosForFee(btcUtxos, {
    suitable,
  });

  return tx;
}
