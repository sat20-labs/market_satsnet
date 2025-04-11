import * as bitcoin from 'bitcoinjs-lib';
import { networks, Signer as BTCSigner } from 'bitcoinjs-lib';
import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs';
import ECPairFactory, { type ECPairInterface } from 'ecpair';

interface IWIFWallet {
  network: string;
  privateKey: string;
}

const ECPair = ECPairFactory(ecc);

function tapTweakHash(pubKey: Buffer, h?: Buffer): Buffer {
  return bitcoin.crypto.taggedHash(
    'TapTweak',
    h ? Buffer.concat([pubKey as any, h]) : pubKey,
  );
}

export function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.subarray(1, 33);
}

export function tweakSigner(
  signer: ECPairInterface,
  opts: { network?: any; tweakHash?: Buffer } = {},
): BTCSigner {
  const privateKey = signer.privateKey;
  if (!privateKey) {
    throw new Error('Private key is required for tweaking signer!');
  }

  const adjustedPrivateKey =
    signer.publicKey[0] === 3 ? ecc.privateNegate(privateKey) : privateKey;
  const tweakedPrivateKey = ecc.privateAdd(
    adjustedPrivateKey,
    tapTweakHash(toXOnly(signer.publicKey as Buffer), opts.tweakHash),
  );

  if (!tweakedPrivateKey) {
    throw new Error('Invalid tweaked private key!');
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  }) as any;
}

export const createWifPrivateKey = (network: string): string => {
  const bitcoinNetwork =
    network === 'mainnet' || network === 'livenet'
      ? networks.bitcoin
      : networks.testnet;
  const keyPair = ECPair.makeRandom({ network: bitcoinNetwork });
  return keyPair.toWIF();
};

export class WIFWallet {
  private network: any;
  public ecPair: ECPairInterface;
  public address: string;
  public signer: BTCSigner;
  public output: Buffer;

  constructor(walletParam: IWIFWallet) {
    console.log('walletParam', walletParam);

    this.network =
      walletParam.network === 'livenet' || walletParam.network === 'mainnet'
        ? networks.bitcoin
        : networks.testnet;
    console.log('this.network', this.network);

    this.ecPair = ECPair.fromWIF(walletParam.privateKey, this.network);
    this.signer = tweakSigner(this.ecPair, { network: this.network });

    const p2pktr = bitcoin.payments.p2tr({
      pubkey: toXOnly(this.signer.publicKey),
      network: this.network,
    });

    this.address = p2pktr.address ?? '';
    this.output = p2pktr.output as Buffer;
  }

  signPsbt(psbt: bitcoin.Psbt): bitcoin.Psbt {
    for (let i = 0; i < psbt.inputCount; i++) {
      psbt.signInput(i, this.signer);
    }
    psbt.finalizeAllInputs();
    return psbt;
  }
}
