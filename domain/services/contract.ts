import * as marketApi from '@/api/market';

export interface DaoRegisterItem {
  Id: number;
  InUtxo: string;
  Address: string;
  UID: string;
  ReferrerUID: string;
}

export interface DaoAirdropItem {
  Id: number;
  InUtxo: string;
  Address: string;
  UID: string;
  ReferralUIDs: string[];
}

export interface DaoContractStatus {
  contractType: 'dao.tc' | string;
  assetName: { Protocol: string; Type: string; Ticker: string };
  startBlock: number;
  endBlock: number;
  AssetAmt?: string;
  SatValue?: number;
  ValidatorNum: number;
  RegisterFee: number;
  RegisterTimeOut: number;
  HoldingAssetName: { Protocol: string; Type: string; Ticker: string };
  HoldingAssetThreshold: string;
  AirDropRatio: string;
  AirDropLimit: string;
  AirDropTimeOut: number;
  ReferralRatio: number;
  deployTime?: number;
  status?: number;
  enableBlock?: number;
  currentBlock?: number;
  enableBlockL1?: number;
  currentBlockL1?: number;
  enableTxId?: string;
  deployer?: string;
  resvId?: number;
  channelAddr?: string;
  invokeCount?: number;
  divisibility?: number;
  uidCount?: number;
  registerList?: Array<string>;
  airdropList?: Array<string>;
  AssetAmtInPool?: { Precision: number; Value: string };
  SatsValueInPool?: number;
  TotalDonateCount?: number;
  TotalDonateAmt?: { Precision: number; Value: string };
  TotalInputValue?: number;
  TotalAirdropCount?: number;
  TotalAirdropAmt?: any;
  TotalFeeValue?: number;
  Validators?: Record<string, { Precision: number; Value: string }>;
}

export default class ContractService {
  private readonly client: typeof marketApi;

  constructor(client: typeof marketApi) {
    this.client = client;
  }

  async getDeployedContractInfo() {
    const res = await this.client.getDeployedContractInfo();
    return res.url || [];
  }

  async getContractStatus(uri: string) {
    const { status } = await this.client.getContractStatus(uri);
    console.log('status', status);
    return status ? JSON.parse(status) : null;
  }

  async getContractHistory(url: string, pageStart: number = 0, pageLimit: number = 20) {
    const { status } = await this.client.getContractInvokeHistory(url, pageStart, pageLimit);
    const data = status ? JSON.parse(status) : null;
    if (!data) return { data: [], total: 0 };
    return {
      data: data.data.filter(Boolean),
      total: data.total,
    };
  }

  async getContractAllAddresses(uri: string, pageStart: number = 0, pageLimit: number = 20) {
    const res = await this.client.getContractAllAddresses(uri, pageStart, pageLimit);
    return res;
  }

  async getContractAnalytics(url: string) {
    const { status } = await this.client.getContractAnalytics(url);
    return status ? JSON.parse(status) : null;
  }

  async getContractStatusByAddress(url: string, address: string) {
    const { status} = await this.client.getContractStatusByAddress(url, address);
    return status ? JSON.parse(status) : null;
  }

  async getUserHistoryInContract(url: string, address: string, pageStart: number = 0, pageLimit: number = 20) {
    const { status } = await this.client.getUserHistoryInContract(url, address, pageStart, pageLimit);
    const data = status ? JSON.parse(status) : null;
    if (!data) return { data: [], total: 0 };
    return {
      data: data.data.filter(Boolean),
      total: data.total,
    };
  }
  async getFeeForInvokeContract(url: string, invoke: string) {
    const res = await this.client.getContractInvokeFee(url, invoke);
    return res?.fee ?? 0;
  }
}

export const contractService = new ContractService(marketApi);