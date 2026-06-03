'use client';

type SignPsbtOptions = Record<string, unknown>;

export interface WalletAdapter {
  requestAccounts: () => Promise<string[]>;
  getAccounts: () => Promise<string[]>;
  getPublicKey: () => Promise<string>;
  getNetwork: () => Promise<string>;
  signPsbt: (psbtHex: string, options?: SignPsbtOptions) => Promise<string>;
  signMessage: (message: string) => Promise<any>;
  batchSendAssetsSatsNet: (assetName: string, amount: number, batchQuantity: number) => Promise<any>;
  buildBatchSellOrderSatsNet: (orderRaws: string[], address: string, network: string) => Promise<any>;
  splitBatchSignedPsbtSatsNet: (signedPsbt: string, network: string) => Promise<any>;
  mergeBatchSignedPsbtSatsNet: (orderRaws: string[], network: string) => Promise<any>;
  finalizeSellOrderSatsNet: (
    psbt: string,
    buyUtxoInfos: string[],
    address: string,
    serviceAddress: string | undefined,
    network: string,
    serviceFee: number,
    networkFee: number
  ) => Promise<any>;
  extractTxFromPsbt: (psbt: string, chain: string) => Promise<string>;
  getUtxosWithAssetSatsNet: (address: string, assetName: string, amount: number) => Promise<any>;
  getAssetAmountSatsNet: (address: string, assetName: string) => Promise<any>;
  getAssetAmount: (address: string, assetName: string) => Promise<any>;
  getDeployedContractStatus: (contractUrl: string) => Promise<any>;
  getSupportedContracts: () => Promise<any>;
  getParamForInvokeContract: (contractType: string, method: string) => Promise<any>;
  switchNetwork: (network: string) => Promise<any>;
  deployContractRemote: (contractType: string, params: string, feeRate: string, broadcast: boolean) => Promise<any>;
  invokeContractSatsNet: (contractUrl: string, params: string, feeRate: string) => Promise<any>;
  invokeContractV2: (...args: unknown[]) => Promise<any>;
  invokeContractV2SatsNet: (
    contractUrl: string,
    params: string,
    assetName: string,
    amount: string,
    feeRate: string,
    customData?: unknown
  ) => Promise<any>;
  batchSendAssetsV2SatsNet: (addresses: string[], assetName: string, amounts: string[]) => Promise<any>;
  lockUtxoSatsNet: (address: string, utxo: string, lockType: string) => Promise<any>;
  unlockUtxoSatsNet: (address: string, utxo: string) => Promise<any>;
  registerAsReferrer: (name: string, type: number) => Promise<any>;
  bindReferrerForServer: (referrerName: string, serverPubKey: string) => Promise<any>;
}

const normalizeSignedPsbt = (result: unknown): string | null => {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object') {
    const value = result as Record<string, unknown>;
    if (typeof value.psbt === 'string') {
      return value.psbt;
    }
    if (value.data && typeof value.data === 'object') {
      const data = value.data as Record<string, unknown>;
      if (typeof data.psbt === 'string') {
        return data.psbt;
      }
    }
  }

  return null;
};

const normalizeStringArray = (result: unknown): string[] | null => {
  if (Array.isArray(result) && result.every((item) => typeof item === 'string')) {
    return result;
  }

  if (result && typeof result === 'object') {
    const value = result as Record<string, unknown>;
    if (Array.isArray(value.accounts) && value.accounts.every((item) => typeof item === 'string')) {
      return value.accounts;
    }
    if (value.data && typeof value.data === 'object') {
      const data = value.data as Record<string, unknown>;
      if (Array.isArray(data.accounts) && data.accounts.every((item) => typeof item === 'string')) {
        return data.accounts;
      }
    }
  }

  return null;
};

const normalizeStringValue = (result: unknown, keys: string[]): string | null => {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object') {
    const value = result as Record<string, unknown>;
    for (const key of keys) {
      const candidate = value[key];
      if (typeof candidate === 'string') {
        return candidate;
      }
    }
    if (value.data && typeof value.data === 'object') {
      const data = value.data as Record<string, unknown>;
      for (const key of keys) {
        const candidate = data[key];
        if (typeof candidate === 'string') {
          return candidate;
        }
      }
    }
  }

  return null;
};

const getFallbackProvider = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.sat20?.isSat20Pwa ? window.sat20 : null;
};

const getSat20Provider = () => {
  if (typeof window === 'undefined' || !window.sat20) {
    throw new Error('SAT20 wallet API is not available');
  }

  return window.sat20;
};

const callSat20 = async <T = any>(method: string, ...args: unknown[]): Promise<T> => {
  const sat20 = getSat20Provider();
  const fn = sat20[method];
  if (typeof fn !== 'function') {
    throw new Error(`SAT20 wallet method ${method} is not available`);
  }

  return await fn.apply(sat20, args);
};

const normalizeExtractedTx = (result: unknown): string | null => {
  if (typeof result === 'string') {
    return result;
  }

  if (result && typeof result === 'object') {
    const value = result as Record<string, unknown>;
    if (typeof value.tx === 'string') {
      return value.tx;
    }
    if (typeof value.raw === 'string') {
      return value.raw;
    }
    if (value.data && typeof value.data === 'object') {
      const data = value.data as Record<string, unknown>;
      if (typeof data.tx === 'string') {
        return data.tx;
      }
      if (typeof data.raw === 'string') {
        return data.raw;
      }
    }
  }

  return null;
};

const withDataEnvelope = (result: any, key: string) => {
  if (!result || typeof result !== 'object' || result.data?.[key] || result[key] === undefined) {
    return result;
  }

  return {
    ...result,
    data: {
      ...(result.data || {}),
      [key]: result[key],
    },
  };
};

const withTopLevelData = (result: any, keys: string[]) => {
  if (!result || typeof result !== 'object' || !result.data || typeof result.data !== 'object') {
    return result;
  }

  const data = result.data as Record<string, unknown>;
  const topLevel = result as Record<string, unknown>;
  const additions = keys.reduce<Record<string, unknown>>((acc, key) => {
    if (topLevel[key] === undefined && data[key] !== undefined) {
      acc[key] = data[key];
    }
    return acc;
  }, {});

  return Object.keys(additions).length > 0
    ? { ...result, ...additions }
    : result;
};

export const getWalletAdapter = (btcWallet?: any): WalletAdapter => {
  const signingProvider = btcWallet || getFallbackProvider();

  return {
    requestAccounts: async () => {
      const result = await callSat20('requestAccounts');
      const accounts = normalizeStringArray(result);
      if (!accounts) {
        throw new Error('Wallet did not return accounts');
      }

      return accounts;
    },
    getAccounts: async () => {
      const result = await callSat20('getAccounts');
      const accounts = normalizeStringArray(result);
      if (!accounts) {
        throw new Error('Wallet did not return accounts');
      }

      return accounts;
    },
    getPublicKey: async () => {
      const result = await callSat20('getPublicKey');
      const publicKey = normalizeStringValue(result, ['publicKey', 'pubKey']);
      if (!publicKey) {
        throw new Error('Wallet did not return a public key');
      }

      return publicKey;
    },
    getNetwork: async () => {
      const result = await callSat20('getNetwork');
      const network = normalizeStringValue(result, ['network']);
      if (!network) {
        throw new Error('Wallet did not return a network');
      }

      return network;
    },
    signPsbt: async (psbtHex: string, options?: SignPsbtOptions) => {
      if (!signingProvider?.signPsbt) {
        throw new Error('Wallet signPsbt is not available');
      }

      const result = await signingProvider.signPsbt(psbtHex, options);
      const signedPsbt = normalizeSignedPsbt(result);
      if (!signedPsbt) {
        throw new Error('Wallet did not return a signed PSBT');
      }

      return signedPsbt;
    },
    signMessage: (message: string) => {
      return callSat20('signMessage', message);
    },
    batchSendAssetsSatsNet: (assetName: string, amount: number, batchQuantity: number) => {
      return callSat20('batchSendAssets_SatsNet', assetName, amount, batchQuantity);
    },
    buildBatchSellOrderSatsNet: async (orderRaws: string[], address: string, network: string) => {
      return withDataEnvelope(
        await callSat20('buildBatchSellOrder_SatsNet', orderRaws, address, network),
        'psbt'
      );
    },
    splitBatchSignedPsbtSatsNet: async (signedPsbt: string, network: string) => {
      return withDataEnvelope(
        await callSat20('splitBatchSignedPsbt_SatsNet', signedPsbt, network),
        'psbts'
      );
    },
    mergeBatchSignedPsbtSatsNet: async (orderRaws: string[], network: string) => {
      return withDataEnvelope(
        await callSat20('mergeBatchSignedPsbt_SatsNet', orderRaws, network),
        'psbt'
      );
    },
    finalizeSellOrderSatsNet: (
      psbt: string,
      buyUtxoInfos: string[],
      address: string,
      serviceAddress: string | undefined,
      network: string,
      serviceFee: number,
      networkFee: number
    ) => {
      return callSat20(
        'finalizeSellOrder_SatsNet',
        psbt,
        buyUtxoInfos,
        address,
        serviceAddress,
        network,
        serviceFee,
        networkFee
      );
    },
    extractTxFromPsbt: async (psbt: string, chain: string) => {
      const result = await callSat20('extractTxFromPsbt', psbt, chain);
      const tx = normalizeExtractedTx(result);
      if (!tx) {
        throw new Error('Wallet did not return an extracted transaction');
      }

      return tx;
    },
    getUtxosWithAssetSatsNet: (address: string, assetName: string, amount: number) => {
      return callSat20('getUtxosWithAsset_SatsNet', address, assetName, amount);
    },
    getAssetAmountSatsNet: (address: string, assetName: string) => {
      return callSat20('getAssetAmount_SatsNet', address, assetName)
        .then((result) => withTopLevelData(result, ['availableAmt', 'lockedAmt']));
    },
    getAssetAmount: (address: string, assetName: string) => {
      return callSat20('getAssetAmount', address, assetName)
        .then((result) => withTopLevelData(result, ['availableAmt', 'lockedAmt']));
    },
    getDeployedContractStatus: (contractUrl: string) => {
      return callSat20('getDeployedContractStatus', contractUrl)
        .then((result) => withTopLevelData(result, ['contractStatus']));
    },
    getSupportedContracts: () => {
      return callSat20('getSupportedContracts')
        .then((result) => withTopLevelData(result, ['contractContents']));
    },
    getParamForInvokeContract: (contractType: string, method: string) => {
      return callSat20('getParamForInvokeContract', contractType, method);
    },
    switchNetwork: (network: string) => {
      return callSat20('switchNetwork', network);
    },
    deployContractRemote: (contractType: string, params: string, feeRate: string, broadcast: boolean) => {
      return callSat20('deployContract_Remote', contractType, params, feeRate, broadcast);
    },
    invokeContractSatsNet: (contractUrl: string, params: string, feeRate: string) => {
      return callSat20('invokeContract_SatsNet', contractUrl, params, feeRate);
    },
    invokeContractV2: (...args: unknown[]) => {
      return callSat20('invokeContractV2', ...args);
    },
    invokeContractV2SatsNet: (
      contractUrl: string,
      params: string,
      assetName: string,
      amount: string,
      feeRate: string,
      customData?: unknown
    ) => {
      return callSat20('invokeContractV2_SatsNet', contractUrl, params, assetName, amount, feeRate, customData);
    },
    batchSendAssetsV2SatsNet: (addresses: string[], assetName: string, amounts: string[]) => {
      return callSat20('batchSendAssetsV2_SatsNet', addresses, assetName, amounts);
    },
    lockUtxoSatsNet: (address: string, utxo: string, lockType: string) => {
      return callSat20('lockUtxo_SatsNet', address, utxo, lockType);
    },
    unlockUtxoSatsNet: (address: string, utxo: string) => {
      return callSat20('unlockUtxo_SatsNet', address, utxo);
    },
    registerAsReferrer: (name: string, type: number) => {
      return callSat20('registerAsReferrer', name, type);
    },
    bindReferrerForServer: (referrerName: string, serverPubKey: string) => {
      return callSat20('bindReferrerForServer', referrerName, serverPubKey);
    },
  };
};
