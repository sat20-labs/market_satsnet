import * as marketApi from '@/api/market';

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
    return status ? JSON.parse(status) : null;
  }

  async getContractInvokeHistory(url: string, pageStart: number = 0, pageLimit: number = 20) {
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
    const res = await window.sat20.getFeeForInvokeContract(url, invoke);
    return res?.fee ?? 0;
  }
}

export const contractService = new ContractService(marketApi);