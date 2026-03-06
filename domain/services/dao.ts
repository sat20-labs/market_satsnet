import { useCommonStore } from '@/store/common';

export const DAO_ACTION_REGISTER = 'register' as const;
export const DAO_ACTION_DONATE = 'donate' as const;
export const DAO_ACTION_AIRDROP = 'airdrop' as const;
export const DAO_ACTION_VALIDATE = 'validate' as const;

export const DAO_ORDERTYPE_REGISTER = 15 as const;
export const DAO_ORDERTYPE_DONATE = 16 as const;
export const DAO_ORDERTYPE_AIRDROP = 17 as const;
export const DAO_ORDERTYPE_VALIDATE = 18 as const;

export type DaoInvokeAction =
  | typeof DAO_ACTION_REGISTER
  | typeof DAO_ACTION_DONATE
  | typeof DAO_ACTION_AIRDROP
  | typeof DAO_ACTION_VALIDATE;

export type DaoInvokeParam = {
  action: DaoInvokeAction;
  // NOTE: 后端与现有合约一致：param 是 string 化 JSON
  param: string;
};

export type DaoRegisterParam = {
  uid: string;
  referrerUid?: string;
};

export type DaoDonateParam = {
  assetName: string;
  amt: string;
  value: number;
};

export type DaoAirdropParam = {
  uids: string[];
};

export type DaoValidateParam = {
  orderType: number;
  result: number;
  reason?: string;
  // base64( "id id id" )
  para: string;
};

export function buildDaoInvoke(action: DaoInvokeAction, paramObj: any): DaoInvokeParam {
  return {
    action,
    param: JSON.stringify(paramObj ?? {}),
  };
}

export function buildValidateParaFromIds(ids: Array<number | string | bigint>): string {
  const payload = ids.map((x) => String(x)).join(' ').trim();
  // btoa only supports latin1; ids are digits and spaces, safe.
  return typeof window !== 'undefined' ? window.btoa(payload) : Buffer.from(payload, 'utf8').toString('base64');
}

export async function invokeDaoContractSatsNet(contractUrl: string, invoke: DaoInvokeParam) {
  if (!window.sat20?.invokeContract_SatsNet) {
    throw new Error('sat20 wallet API not available');
  }
  const { btcFeeRate } = useCommonStore.getState();
  const feeRate = (btcFeeRate?.value ?? 0).toString();
  return window.sat20.invokeContract_SatsNet(contractUrl, JSON.stringify(invoke), feeRate);
}

export function buildRegisterInvoke(uid: string, referrerUid?: string) {
  const p: DaoRegisterParam = { uid: uid.trim(), ...(referrerUid ? { referrerUid: referrerUid.trim() } : {}) };
  return buildDaoInvoke(DAO_ACTION_REGISTER, p);
}

export function buildDonateInvoke(assetName: string, amt: string, value: number) {
  const p: DaoDonateParam = { assetName, amt, value };
  return buildDaoInvoke(DAO_ACTION_DONATE, p);
}

export function buildAirdropInvoke(uids: string[]) {
  const p: DaoAirdropParam = { uids };
  return buildDaoInvoke(DAO_ACTION_AIRDROP, p);
}

export function buildValidateInvoke(orderType: number, ids: Array<number | string | bigint>, reason: string, result: number = -1) {
  const p: DaoValidateParam = {
    orderType,
    result,
    reason,
    para: buildValidateParaFromIds(ids),
  };
  return buildDaoInvoke(DAO_ACTION_VALIDATE, p);
}
