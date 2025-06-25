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
    const res = await this.client.getContractInvokeHistory(url, pageStart, pageLimit);
    return res;
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
    const res = await this.client.getContractStatusByAddress(url, address);
    return res;
  }

  async getUserHistoryInContract(url: string, address: string, pageStart: number = 0, pageLimit: number = 20) {
    const res = await this.client.getUserHistoryInContract(url, address, pageStart, pageLimit);
    return res;
  }
}

export const contractService = new ContractService(marketApi);