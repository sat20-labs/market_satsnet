import { create } from 'zustand'

interface AssetState {
  // 状态定义
  assetList: any[]
  uniqueAssetList: any[]
  sat20List: any[]
  plainList: any[]
  plainUtxos: any[]
  runesList: any[]
  brc20List: any[]
  ordList: any[]
  
  // getter
  balance: number
  
  // actions
  setAssetList: (list: any[]) => void
  setUniqueAssetList: (list: any[]) => void
  setSat20List: (list: any[]) => void
  setPlainList: (list: any[]) => void
  setPlainUtxos: (list: any[]) => void
  setRunesList: (list: any[]) => void
  setBrc20List: (list: any[]) => void
  setOrdList: (list: any[]) => void
  reset: () => void
}

export const useAssetStore = create<AssetState>((set, get) => ({
  // 初始状态
  assetList: [],
  uniqueAssetList: [],
  sat20List: [],
  plainList: [],
  plainUtxos: [],
  runesList: [],
  brc20List: [],
  ordList: [],
  
  // 计算属性转换为 getter
  get balance() {
    return get().plainList.reduce((acc, item) => acc + Number(item.amount), 0)
  },
  
  // Actions
  setAssetList: (list) => set({ assetList: list }),
  setUniqueAssetList: (list) => set({ uniqueAssetList: list }),
  setSat20List: (list) => set({ sat20List: list }),
  setPlainList: (list) => set({ plainList: list }),
  setPlainUtxos: (list) => set({ plainUtxos: list }),
  setRunesList: (list) => set({ runesList: list }),
  setBrc20List: (list) => set({ brc20List: list }),
  setOrdList: (list) => set({ ordList: list }),
  
  reset: () => set({
    assetList: [],
    uniqueAssetList: [],
    sat20List: [],
    plainList: [],
    plainUtxos: [],
    runesList: [],
    brc20List: [],
    ordList: [],
  })
}))
