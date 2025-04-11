// import * as bitcoinjs from 'bitcoinjs-lib';
// import * as ecc from '@bitcoin-js/tiny-secp256k1-asmjs';

// bitcoinjs.initEccLib(ecc);
// export const getBitcoinNetwork = (network: string) => {
//   return network === 'testnet'
//     ? bitcoinjs.networks.testnet
//     : bitcoinjs.networks.bitcoin;
// };

// export default bitcoinjs;
import { core } from '../wallet-sdk';
export const bitcoin = core.bitcoin;
export const ECPair = core.ECPair;
