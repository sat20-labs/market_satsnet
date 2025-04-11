import localforage, { setItem } from 'localforage';

class Storage {
  async setItem(key: string, value: any) {
    return localforage.setItem(key, value);
  }

  async getItem(key: string) {
    return localforage.getItem(key);
  }

  async removeItem(key: string) {
    return localforage.removeItem(key);
  }
}

const storage = new Storage();

class InscribeOrderHistory {
  storage: Storage = storage;
  storage_key = 'inscribe_order_history';

  setList = async (list: any[]) => {
    const listStr = JSON.stringify(list);
    return this.storage.setItem(this.storage_key, listStr);
  };
  getList = async () => {
    const listStr = (await this.storage.getItem(this.storage_key)) as string;
    try {
      if (listStr) {
        return JSON.parse(listStr);
      }
      return [];
    } catch (error) {
      return [];
    }
  };
  addItem = async (order: any) => {
    const list = await this.getList();
    list.push(order);
    return this.setList(list);
  };
}
const inscribeOrderHistory = new InscribeOrderHistory();
export { inscribeOrderHistory };
export default storage;
