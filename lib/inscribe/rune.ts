import { WIFWallet, toXOnly } from '@/lib/inscribe/WIFWallet';
import { sleep } from 'radash';
import { bitcoin } from '@/lib/wallet/bitcoin';
import { toPsbtNetwork, NetworkType } from '@/lib/wallet/network';
import { useReactWalletStore } from '@sat20/btc-connect/dist/react';

interface MintRuneParams {
  secret: string;
  network: string;
  opReturnScript: string;
  files: any[];
  toAddress: string;
  feeRate: number;
  runeMetadata: any;
  utxo: { txid: string; vout: number; value: number };
}

export async function mintRune({
  secret,
  network,
  opReturnScript,
  files,
  toAddress,
  runeMetadata,
  feeRate,
  utxo,
}: MintRuneParams): Promise<string | undefined> {
  console.log(
    'mintRune',
    secret,
    network,
    opReturnScript,
    files,
    toAddress,
    feeRate,
    utxo,
  );

  const wallet = new WIFWallet({ network, privateKey: secret });
  const fee = Math.ceil(runeMetadata.oneNetworkFee);
  const btcNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );
  const txHexs: { psbtHex: string; hex: string; id: string }[] = [];

  const createPsbt = (
    inputUtxo: typeof utxo,
    outputAddress: string,
    outputValue: number,
  ) => {
    const psbt = new bitcoin.Psbt({ network: btcNetwork });
    psbt.addInput({
      hash: inputUtxo.txid,
      index: inputUtxo.vout,
      witnessUtxo: { value: inputUtxo.value, script: wallet.output! },
      tapInternalKey: toXOnly(wallet.ecPair.publicKey as Buffer),
    } as any);
    psbt.addOutput({ script: Buffer.from(opReturnScript, 'hex'), value: 0 });
    if (outputValue > 0) {
      psbt.addOutput({ address: outputAddress, value: outputValue });
    }
    return psbt;
  };

  if (files.length < 3) {
    const psbt = createPsbt(utxo, toAddress, 330);
    const signedPsbt = wallet.signPsbt(psbt);
    console.log('signedPsbt', signedPsbt);

    const tx = signedPsbt.extractTransaction();
    txHexs.push({
      psbtHex: signedPsbt.toHex(),
      hex: tx.toHex(),
      id: tx.getId(),
    });
  } else {
    let parentUtxo = utxo;
    console.log('parentUtxo', parentUtxo);

    for (let i = 0; i < files.length - 1; i++) {
      const psbt = createPsbt(parentUtxo, toAddress, 0);
      const balance = parentUtxo.value - fee;
      if (i < files.length - 2) {
        psbt.addOutput({ address: wallet.address, value: balance });
      } else {
        psbt.addOutput({ address: toAddress, value: 330 });
      }
      const signedPsbt = wallet.signPsbt(psbt);
      console.log('signedPsbt', signedPsbt);

      const tx = signedPsbt.extractTransaction();
      parentUtxo = { txid: tx.getId(), vout: 1, value: balance };
      txHexs.push({
        psbtHex: signedPsbt.toHex(),
        hex: tx.toHex(),
        id: tx.getId(),
      });
    }
  }

  const { btcWallet } = useReactWalletStore.getState();
  if (!btcWallet) throw new Error('No wallet connected');
  const txids: any = [];
  for (let i = 0; i < txHexs.length; i++) {
    const { psbtHex } = txHexs[i];
    let txid;
    try {
      txid = await btcWallet.pushPsbt(psbtHex);
    } catch (error: any) {
      console.log(error);
      throw error;
    }
    if (txid) {
      try {
        txids.push(JSON.parse(txid));
      } catch (error) {
        txids.push(txid);
      }
    }
    await sleep(3000);
  }
  return txids[txids.length - 1];
}

export async function etchRune({
  secret,
  network,
  opReturnScript,
  files,
  inscription,
  toAddress,
  feeRate,
  utxo,
}: any): Promise<string | undefined> {
  console.log(
    'etchRune',
    secret,
    network,
    opReturnScript,
    files,
    toAddress,
    feeRate,
    utxo,
    inscription,
  );

  const wallet = new WIFWallet({ network, privateKey: secret });
  const btcNetwork = toPsbtNetwork(
    network === 'testnet' ? NetworkType.TESTNET : NetworkType.MAINNET,
  );
  
  const psbt = new bitcoin.Psbt({ network: btcNetwork });
  psbt.addInput({
    hash: utxo.txid,
    index: 0,
    witnessUtxo: { value: utxo.value, script: Buffer.from(inscription.p2tr_script, 'hex') },
    tapLeafScript: [
      {
        leafVersion: inscription.redeemVersion,
        script: Buffer.from(inscription.script, 'hex'),
        controlBlock: Buffer.from(inscription.cb, 'hex'),
      },
    ],
  } as any);
  
  psbt.addOutput({ script: Buffer.from(opReturnScript, 'hex'), value: 0 });
  psbt.addOutput({ address: toAddress, value: 330 });
  console.log('psbt', psbt);
  psbt.signInput(0, wallet.ecPair);
  psbt.finalizeAllInputs();
  console.log('psbt hex', psbt.toHex());
  const tx = psbt.extractTransaction();
  console.log('tx', tx);
  
  const { btcWallet } = useReactWalletStore.getState();
  if (!btcWallet) throw new Error('No wallet connected');
  const txid = await btcWallet.pushPsbt(psbt.toHex());
  return txid;
}
