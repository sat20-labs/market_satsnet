'use client';

const SAT20_DAPP_PROTOCOL = 'sat20-dapp-connect';
const REQUEST_TIMEOUT = 180_000;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type Sat20PwaProvider = {
  isSat20Pwa: true;
  requestAccounts: () => Promise<string[]>;
  getAccounts: () => Promise<string[]>;
  getPublicKey: () => Promise<string>;
  getNetwork: () => Promise<string>;
  switchNetwork: (network: string) => Promise<unknown>;
  signPsbt: (psbtHex: string, options?: Record<string, unknown>) => Promise<unknown>;
  signMessage: (message: string) => Promise<unknown>;
  buildBatchSellOrder_SatsNet: (...args: unknown[]) => Promise<unknown>;
  splitBatchSignedPsbt_SatsNet: (...args: unknown[]) => Promise<unknown>;
  mergeBatchSignedPsbt_SatsNet: (...args: unknown[]) => Promise<unknown>;
  finalizeSellOrder_SatsNet: (...args: unknown[]) => Promise<unknown>;
  extractTxFromPsbt: (...args: unknown[]) => Promise<unknown>;
  getUtxosWithAsset_SatsNet: (...args: unknown[]) => Promise<unknown>;
  getAssetAmount: (...args: unknown[]) => Promise<unknown>;
  getAssetAmount_SatsNet: (...args: unknown[]) => Promise<unknown>;
  lockUtxo_SatsNet: (...args: unknown[]) => Promise<unknown>;
  unlockUtxo_SatsNet: (...args: unknown[]) => Promise<unknown>;
  deployContract_Remote: (...args: unknown[]) => Promise<unknown>;
  invokeContract_SatsNet: (...args: unknown[]) => Promise<unknown>;
  invokeUnifiedContract: (...args: unknown[]) => Promise<unknown>;
  invokeContractV2: (...args: unknown[]) => Promise<unknown>;
  invokeContractV2_SatsNet: (...args: unknown[]) => Promise<unknown>;
  getDeployedContractStatus: (...args: unknown[]) => Promise<unknown>;
  getSupportedContracts: (...args: unknown[]) => Promise<unknown>;
  getParamForInvokeContract: (...args: unknown[]) => Promise<unknown>;
  registerAsReferrer: (...args: unknown[]) => Promise<unknown>;
  bindReferrerForServer: (...args: unknown[]) => Promise<unknown>;
  batchSendAssets_SatsNet: (...args: unknown[]) => Promise<unknown>;
  batchSendAssetsV2_SatsNet: (...args: unknown[]) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  [method: string]: unknown;
};

declare global {
  interface Window {
    __sat20PwaProvider?: Sat20PwaProvider;
  }
}

const pendingRequests = new Map<string, PendingRequest>();
const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
const latestEventPayloads = new Map<string, unknown[]>();
let walletOrigin = '*';
let installed = false;
let locationReporterInstalled = false;

export const isSat20PwaEmbedded = () => {
  return typeof window !== 'undefined' && window.parent !== window;
};

const emit = (event: string, ...args: unknown[]) => {
  latestEventPayloads.set(event, args);
  listeners.get(event)?.forEach((handler) => handler(...args));
};

const createRequestId = () => {
  return `sat20_pwa_${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const createNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const requestWalletReady = () => {
  if (!isSat20PwaEmbedded()) {
    return;
  }

  window.parent.postMessage({
    type: 'SAT20_DAPP_CLIENT_READY',
    protocol: SAT20_DAPP_PROTOCOL,
    origin: window.location.origin,
    href: window.location.href,
    nonce: createNonce(),
  }, walletOrigin);
};

const installLocationReporter = () => {
  if (locationReporterInstalled) {
    return;
  }
  locationReporterInstalled = true;

  const report = () => {
    setTimeout(requestWalletReady, 0);
  };
  const wrapHistory = (method: 'pushState' | 'replaceState') => {
    const original = window.history[method];
    window.history[method] = function (...args) {
      const result = original.apply(this, args);
      report();
      return result;
    };
  };

  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', report);
  window.addEventListener('pageshow', report);
};

const sendRequest = (action: string, params: unknown[] = []) => {
  if (!isSat20PwaEmbedded()) {
    return Promise.reject(new Error('SAT20 PWA wallet is not available'));
  }

  const requestId = createRequestId();
  const expiresAt = Date.now() + REQUEST_TIMEOUT;

  return new Promise<unknown>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`SAT20 PWA request timed out: ${action}`));
    }, REQUEST_TIMEOUT);

    pendingRequests.set(requestId, { resolve, reject, timeoutId });

    window.parent.postMessage({
      type: 'SAT20_DAPP_REQUEST',
      protocol: SAT20_DAPP_PROTOCOL,
      requestId,
      origin: window.location.origin,
      action,
      params,
      nonce: createNonce(),
      expiresAt,
    }, walletOrigin);
  });
};

const handleMessage = (event: MessageEvent) => {
  if (event.source !== window.parent) {
    return;
  }

  const message = event.data;
  if (!message || message.protocol !== SAT20_DAPP_PROTOCOL) {
    return;
  }

  if (message.type === 'SAT20_DAPP_EVENT') {
    if (message.event === 'ready') {
      walletOrigin = event.origin;
    } else if (walletOrigin !== '*' && event.origin !== walletOrigin) {
      return;
    }
    emit(message.event, message.payload);
    if (message.event === 'accountChanged') {
      emit('accountsChanged', message.payload);
    }
    return;
  }

  if (message.type !== 'SAT20_DAPP_RESPONSE') {
    return;
  }

  if (walletOrigin !== '*' && event.origin !== walletOrigin) {
    return;
  }

  const pending = pendingRequests.get(message.requestId);
  if (!pending) {
    return;
  }

  clearTimeout(pending.timeoutId);
  pendingRequests.delete(message.requestId);

  if (message.success) {
    pending.resolve(message.result);
  } else {
    pending.reject(new Error(message.error?.message || 'SAT20 PWA request failed'));
  }
};

const createProvider = (): Sat20PwaProvider => {
  const requestMethod = (method: string) => (...args: unknown[]) => sendRequest(method, args);
  const requestJsonMethod = (method: string) => (req: unknown) => {
    const normalized = typeof req === 'string' ? JSON.parse(req) : req;
    return sendRequest(method, [normalized]);
  };

  const provider: Sat20PwaProvider = {
    isSat20Pwa: true,
    requestAccounts: () => sendRequest('requestAccounts') as Promise<string[]>,
    getAccounts: () => sendRequest('getAccounts') as Promise<string[]>,
    getPublicKey: () => sendRequest('getPublicKey') as Promise<string>,
    getNetwork: () => sendRequest('getNetwork') as Promise<string>,
    switchNetwork: (network: string) => sendRequest('switchNetwork', [network]),
    signPsbt: (psbtHex: string, options?: Record<string, unknown>) => sendRequest('signPsbt', [psbtHex, options]),
    signMessage: (message: string) => sendRequest('signMessage', [message]),
    buildBatchSellOrder_SatsNet: requestMethod('buildBatchSellOrder_SatsNet'),
    splitBatchSignedPsbt_SatsNet: requestMethod('splitBatchSignedPsbt_SatsNet'),
    mergeBatchSignedPsbt_SatsNet: requestMethod('mergeBatchSignedPsbt_SatsNet'),
    finalizeSellOrder_SatsNet: requestMethod('finalizeSellOrder_SatsNet'),
    extractTxFromPsbt: requestMethod('extractTxFromPsbt'),
    getUtxosWithAsset_SatsNet: requestMethod('getUtxosWithAsset_SatsNet'),
    getAssetAmount: requestMethod('getAssetAmount'),
    getAssetAmount_SatsNet: requestMethod('getAssetAmount_SatsNet'),
    lockUtxo_SatsNet: requestMethod('lockUtxo_SatsNet'),
    unlockUtxo_SatsNet: requestMethod('unlockUtxo_SatsNet'),
    deployContract_Remote: requestMethod('deployContract_Remote'),
    invokeContract_SatsNet: requestMethod('invokeContract_SatsNet'),
    invokeUnifiedContract: requestJsonMethod('invokeUnifiedContract'),
    invokeContractV2: requestMethod('invokeContractV2'),
    invokeContractV2_SatsNet: requestMethod('invokeContractV2_SatsNet'),
    getDeployedContractStatus: requestMethod('getDeployedContractStatus'),
    getSupportedContracts: requestMethod('getSupportedContracts'),
    getParamForInvokeContract: requestMethod('getParamForInvokeContract'),
    registerAsReferrer: requestMethod('registerAsReferrer'),
    bindReferrerForServer: requestMethod('bindReferrerForServer'),
    batchSendAssets_SatsNet: requestMethod('batchSendAssets_SatsNet'),
    batchSendAssetsV2_SatsNet: requestMethod('batchSendAssetsV2_SatsNet'),
    on: (event: string, handler: (...args: unknown[]) => void) => {
      const handlers = listeners.get(event) ?? new Set();
      handlers.add(handler);
      listeners.set(event, handlers);
      const latestPayload = latestEventPayloads.get(event);
      if (latestPayload) {
        handler(...latestPayload);
      }
    },
    removeListener: (event: string, handler: (...args: unknown[]) => void) => {
      listeners.get(event)?.delete(handler);
    },
  };

  return provider;
};

export const installSat20PwaProvider = () => {
  if (!isSat20PwaEmbedded()) {
    return null;
  }

  if (!installed) {
    window.addEventListener('message', handleMessage);
    installLocationReporter();
    installed = true;
  }

  requestWalletReady();

  if (!window.__sat20PwaProvider) {
    window.__sat20PwaProvider = createProvider();
  }

  if (!window.sat20) {
    window.sat20 = window.__sat20PwaProvider;
  }

  return window.__sat20PwaProvider;
};
