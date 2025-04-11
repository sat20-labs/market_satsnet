import { useReactWalletStore } from '@sat20/btc-connect/dist/react';
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
export const splitAsset = async ({
  asset,
  utxos,
  amount,
  feeRate,
}) => {
  const { btcWallet, network, address, publicKey } =
  useReactWalletStore.getState();
  const inputUtxoss: any[] = [];
  const outputs: any[] = [];
  let totalValue = 0;
  const [txid, vout] = asset.utxo.split(':');
  const splitNum = Math.ceil(asset.value / amount);
  
  inputUtxoss.push({
    txid,
    vout: parseInt(vout),
    value: asset.value,
  })
  for (let i = 0; i < splitNum; i++) {
    const output = {
      address: address,
      value: amount,
    };
    outputs.push(output);
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