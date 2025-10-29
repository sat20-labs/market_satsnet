/**
 * Sat20 API 方法使用整理文档
 *
 * 本文档整理了项目中所有使用的 window.sat20 相关方法，
 * 按功能分类并提供使用示例和来源文件。
 *
 * 整理时间：2025年8月
 */

// ==================== 类型定义 ====================

/**
 * Sat20 API 返回值类型
 */
interface Sat20Response<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  txid?: string;
}

/**
 * 网络类型
 */
type NetworkType = 'livenet' | 'testnet';

/**
 * 费率类型
 */
type FeeRate = {
  value: number;
};

// ==================== Sat20 API 方法分类 ====================

/**
 * 1. 网络管理方法
 */
export const NetworkMethods = {
  /**
   * 切换网络
   * @param network - 网络类型 ('livenet' | 'testnet')
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * await window.sat20.switchNetwork('livenet');
   * await window.sat20.switchNetwork('testnet');
   *
   * 使用位置：
   * - components/NetworkSelect.tsx:51
   * - components/wallet/WalletConnectButton.tsx:94
   */
  switchNetwork: (network: NetworkType): Promise<Sat20Response> => {
    return window.sat20.switchNetwork(network);
  }
};

/**
 * 2. 合约管理方法
 */
export const ContractMethods = {
  /**
   * 部署合约（远程）
   * @param contractType - 合约类型
   * @param params - 合约参数（JSON字符串）
   * @param feeRate - 费率
   * @param bol - 布尔值参数
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.deployContract_Remote(
   *   contractType,
   *   JSON.stringify(params),
   *   btcFeeRate.value.toString(),
   *   bol
   * );
   *
   * 使用位置：
   * - app/swap/create/page.tsx:83
   * - app/transcend/create/page.tsx:100, 121
   * - components/satoshinet/limitorder/CreateLimitOrder.tsx:73
   * - components/launchpool/CreatePoolAdvanced.tsx:135
   * - components/launchpool/CreatePoolBasic.tsx:84
   */
  deployContract_Remote: (
    contractType: string,
    params: string,
    feeRate: string,
    bol: boolean
  ): Promise<Sat20Response> => {
    return window.sat20.deployContract_Remote(contractType, params, feeRate, bol);
  },

  /**
   * 获取已部署合约状态
   * @param contractUrl - 合约URL
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.getDeployedContractStatus(contractUrl);
   *
   * 使用位置：
   * - infrastructure/api/amm.ts:4
   * - components/launchpool/CreatePoolAdvanced.tsx:68
   */
  getDeployedContractStatus: (contractUrl: string): Promise<Sat20Response> => {
    return window.sat20.getDeployedContractStatus(contractUrl);
  },

  /**
   * 获取支持的合约列表
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.getSupportedContracts();
   *
   * 使用位置：
   * - lib/hooks/useSupportedContracts.ts:6
   */
  getSupportedContracts: (): Promise<Sat20Response> => {
    return window.sat20.getSupportedContracts();
  },

  /**
   * 调用合约（SatsNet）
   * @param contractUrl - 合约URL
   * @param params - 参数（JSON字符串）
   * @param feeRate - 费率
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.invokeContract_SatsNet(
   *   contractURL,
   *   JSON.stringify(params),
   *   btcFeeRate.value.toString()
   * );
   *
   * 使用位置：
   * - app/limitOrder/detail/page.tsx:96
   * - components/satoshinet/common/MyOrders.tsx:62
   * - components/launchpool/JoinPool.tsx:122
   */
  invokeContract_SatsNet: (
    contractUrl: string,
    params: string,
    feeRate: string
  ): Promise<Sat20Response> => {
    return window.sat20.invokeContract_SatsNet(contractUrl, params, feeRate);
  },

  /**
   * 调用合约V2版本（SatsNet）
   * @param contractUrl - 合约URL
   * @param params - 参数（JSON字符串）
   * @param feeRate - 费率
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * await window.sat20.invokeContractV2_SatsNet(
   *   contractURL,
   *   JSON.stringify(params),
   *   btcFeeRate.value.toString()
   * );
   *
   * 使用位置：
   * - components/satoshinet/limitorder/hooks/useOrderForm.ts:216
   * - components/satoshinet/swap/AddLiquidity.tsx:60
   * - components/satoshinet/swap/Swap.tsx:292, 313
   * - components/satoshinet/swap/RemoveLiquidity.tsx:125
   * - components/satoshinet/swap/Stack.tsx:55
   * - components/satoshinet/swap/WithDraw.tsx:67
   */
  invokeContractV2_SatsNet: (
    contractUrl: string,
    params: string,
    feeRate: string
  ): Promise<Sat20Response> => {
    return window.sat20.invokeContractV2_SatsNet(contractUrl, params, feeRate);
  },

  /**
   * 调用合约V2版本
   * @param contractUrl - 合约URL
   * @param params - 参数（JSON字符串）
   * @param feeRate - 费率
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.invokeContractV2(
   *   contractURL,
   *   JSON.stringify(params),
   *   btcFeeRate.value.toString()
   * );
   *
   * 使用位置：
   * - components/satoshinet/swap/Deposit.tsx:66
   */
  invokeContractV2: (
    contractUrl: string,
    params: string,
    feeRate: string
  ): Promise<Sat20Response> => {
    return window.sat20.invokeContractV2(contractUrl, params, feeRate);
  },

  /**
   * 获取调用合约参数
   * @param contractType - 合约类型
   * @param method - 方法名
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const paramsResult = await window.sat20.getParamForInvokeContract('amm.tc', 'withdraw');
   *
   * 使用位置：
   * - components/satoshinet/swap/WithDraw.tsx:55
   */
  getParamForInvokeContract: (
    contractType: string,
    method: string
  ): Promise<Sat20Response> => {
    return window.sat20.getParamForInvokeContract(contractType, method);
  },

  /**
   * 获取地址在合约中的状态（注释掉的方法）
   * @param contractUrl - 合约URL
   * @param address - 地址
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const { status } = await window.sat20.getAddressStatusInContract(contractURL, item.address);
   *
   * 使用位置：
   * - components/launchpool/DistributionList.tsx:15 (已注释)
   */
  // getAddressStatusInContract: (contractUrl: string, address: string): Promise<Sat20Response> => {
  //   return window.sat20.getAddressStatusInContract(contractUrl, address);
  // }
};

/**
 * 3. 资产管理方法
 */
export const AssetMethods = {
  /**
   * 获取资产数量（SatsNet）
   * @param address - 地址
   * @param assetName - 资产名称
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * return await window.sat20.getAssetAmount_SatsNet(address, assetName);
   *
   * 使用位置：
   * - application/useAssetBalanceService.ts:10
   * - components/account/SellOrderModal.tsx:45
   */
  getAssetAmount_SatsNet: (address: string, assetName: string): Promise<Sat20Response> => {
    return window.sat20.getAssetAmount_SatsNet(address, assetName);
  },

  /**
   * 获取资产数量
   * @param address - 地址
   * @param asset - 资产
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const res = await window.sat20.getAssetAmount(address, asset);
   *
   * 使用位置：
   * - components/satoshinet/swap/Deposit.tsx:43
   */
  getAssetAmount: (address: string, asset: string): Promise<Sat20Response> => {
    return window.sat20.getAssetAmount(address, asset);
  },

  /**
   * 批量发送资产（SatsNet）
   * @param assetName - 资产名称
   * @param amount - 数量
   * @param batchQuantity - 批量数量
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const splitRes = await window.sat20.batchSendAssets_SatsNet('::', totalPrice, batchQuantity);
   *
   * 使用位置：
   * - components/satoshinet/orderbook/BuyOrder.tsx:93
   * - components/satoshinet/orderbook/SellOrder.tsx:86
   */
  batchSendAssets_SatsNet: (
    assetName: string,
    amount: number,
    batchQuantity: number
  ): Promise<Sat20Response> => {
    return window.sat20.batchSendAssets_SatsNet(assetName, amount, batchQuantity);
  },

  /**
   * 批量发送资产V2版本（SatsNet）
   * @param params - 参数
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.batchSendAssetsV2_SatsNet(params);
   *
   * 使用位置：
   * - app/tools/batch-send/page.tsx:119
   */
  batchSendAssetsV2_SatsNet: (params: any): Promise<Sat20Response> => {
    return window.sat20.batchSendAssetsV2_SatsNet(params);
  }
};

/**
 * 4. UTXO 管理方法
 */
export const UTXOMethods = {
  /**
   * 获取包含资产的UTXO（SatsNet）
   * @param address - 地址
   * @param assetName - 资产名称
   * @param amount - 数量
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const utxoRes = await window.sat20.getUtxosWithAsset_SatsNet(address, "::", summary.totalPay);
   *
   * 使用位置：
   * - components/satoshinet/orderbook/TakeOrder.tsx:150, 239
   */
  getUtxosWithAsset_SatsNet: (
    address: string,
    assetName: string,
    amount: number
  ): Promise<Sat20Response> => {
    return window.sat20.getUtxosWithAsset_SatsNet(address, assetName, amount);
  },

  /**
   * 锁定UTXO（SatsNet）
   * @param address - 地址
   * @param utxo - UTXO
   * @param type - 类型 ('buy' | 'sell')
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const res = await window.sat20.lockUtxo_SatsNet(address, utxo, 'buy');
   *
   * 使用位置：
   * - components/satoshinet/orderbook/BuyOrder.tsx:238
   * - components/satoshinet/orderbook/TakeOrder.tsx:212, 301
   */
  lockUtxo_SatsNet: (
    address: string,
    utxo: string,
    type: 'buy' | 'sell'
  ): Promise<Sat20Response> => {
    return window.sat20.lockUtxo_SatsNet(address, utxo, type);
  },

  /**
   * 解锁UTXO（SatsNet）
   * @param address - 地址
   * @param utxo - UTXO
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * await window.sat20.unlockUtxo_SatsNet(address, item.utxo);
   *
   * 使用位置：
   * - components/account/OrdxOrderList.tsx:105
   */
  unlockUtxo_SatsNet: (address: string, utxo: string): Promise<Sat20Response> => {
    return window.sat20.unlockUtxo_SatsNet(address, utxo);
  }
};

/**
 * 5. 订单管理方法
 */
export const OrderMethods = {
  /**
   * 构建批量卖出订单（SatsNet）
   * @param params - 参数
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const sat20BuyOrder = await window.sat20.buildBatchSellOrder_SatsNet(params);
   *
   * 使用位置：
   * - components/satoshinet/orderbook/BuyOrder.tsx:141
   * - components/satoshinet/orderbook/SellOrder.tsx:134
   */
  buildBatchSellOrder_SatsNet: (params: any): Promise<Sat20Response> => {
    return window.sat20.buildBatchSellOrder_SatsNet(params);
  },

  /**
   * 拆分批量签名PSBT（SatsNet）
   * @param signedPsbt - 签名的PSBT
   * @param network - 网络
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const batchSignedPsbts = await window.sat20.splitBatchSignedPsbt_SatsNet(signedPsbt, network);
   *
   * 使用位置：
   * - components/satoshinet/orderbook/BuyOrder.tsx:157
   * - components/satoshinet/orderbook/SellOrder.tsx:151
   */
  splitBatchSignedPsbt_SatsNet: (
    signedPsbt: string,
    network: string
  ): Promise<Sat20Response> => {
    return window.sat20.splitBatchSignedPsbt_SatsNet(signedPsbt, network);
  },

  /**
   * 合并批量签名PSBT（SatsNet）
   * @param orderRaws - 订单原始数据
   * @param network - 网络
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const mergeRaw = await window.sat20.mergeBatchSignedPsbt_SatsNet(orderRaws, network);
   *
   * 使用位置：
   * - components/satoshinet/orderbook/TakeOrder.tsx:172, 261
   */
  mergeBatchSignedPsbt_SatsNet: (
    orderRaws: string[],
    network: string
  ): Promise<Sat20Response> => {
    return window.sat20.mergeBatchSignedPsbt_SatsNet(orderRaws, network);
  },

  /**
   * 完成卖出订单（SatsNet）
   * @param params - 参数
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const finalizeRes = await window.sat20.finalizeSellOrder_SatsNet(params);
   *
   * 使用位置：
   * - components/satoshinet/orderbook/TakeOrder.tsx:178, 267
   */
  finalizeSellOrder_SatsNet: (params: any): Promise<Sat20Response> => {
    return window.sat20.finalizeSellOrder_SatsNet(params);
  }
};

/**
 * 6. 推荐系统方法
 */
export const ReferralMethods = {
  /**
   * 注册为推荐人
   * @param name - 推荐人名称
   * @param type - 类型
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.registerAsReferrer(name, 1);
   *
   * 使用位置：
   * - components/account/ReferrerRegister.tsx:25
   */
  registerAsReferrer: (name: string, type: number): Promise<Sat20Response> => {
    return window.sat20.registerAsReferrer(name, type);
  },

  /**
   * 绑定推荐人（服务器端）
   * @param referrerName - 推荐人名称
   * @param serverPubKey - 服务器公钥
   * @returns Promise<Sat20Response>
   *
   * 使用示例：
   * const result = await window.sat20.bindReferrerForServer(referrerName, serverPubKey);
   *
   * 使用位置：
   * - components/account/ReferrerBind.tsx:23
   */
  bindReferrerForServer: (
    referrerName: string,
    serverPubKey: string
  ): Promise<Sat20Response> => {
    return window.sat20.bindReferrerForServer(referrerName, serverPubKey);
  }
};

// ==================== 使用统计 ====================

/**
 * 方法使用统计
 */
export const MethodUsageStats = {
  // 网络管理
  switchNetwork: 2, // 使用次数

  // 合约管理
  deployContract_Remote: 6,
  getDeployedContractStatus: 2,
  getSupportedContracts: 1,
  invokeContract_SatsNet: 3,
  invokeContractV2_SatsNet: 7,
  invokeContractV2: 1,
  getParamForInvokeContract: 1,

  // 资产管理
  getAssetAmount_SatsNet: 2,
  getAssetAmount: 1,
  batchSendAssets_SatsNet: 2,
  batchSendAssetsV2_SatsNet: 1,

  // UTXO管理
  getUtxosWithAsset_SatsNet: 2,
  lockUtxo_SatsNet: 3,
  unlockUtxo_SatsNet: 1,

  // 订单管理
  buildBatchSellOrder_SatsNet: 2,
  splitBatchSignedPsbt_SatsNet: 2,
  mergeBatchSignedPsbt_SatsNet: 2,
  finalizeSellOrder_SatsNet: 2,

  // 推荐系统
  registerAsReferrer: 1,
  bindReferrerForServer: 1
};

// ==================== 涉及文件列表 ====================

/**
 * 使用sat20方法的文件列表
 */
export const Sat20UsageFiles = [
  // 页面文件
  'app/swap/create/page.tsx',
  'app/transcend/create/page.tsx',
  'app/limitOrder/detail/page.tsx',
  'app/tools/batch-send/page.tsx',

  // 组件文件
  'components/NetworkSelect.tsx',
  'components/wallet/WalletConnectButton.tsx',
  'components/satoshinet/common/MyOrders.tsx',
  'components/satoshinet/orderbook/BuyOrder.tsx',
  'components/satoshinet/orderbook/SellOrder.tsx',
  'components/satoshinet/orderbook/TakeOrder.tsx',
  'components/satoshinet/limitorder/CreateLimitOrder.tsx',
  'components/satoshinet/limitorder/hooks/useOrderForm.ts',
  'components/satoshinet/swap/AddLiquidity.tsx',
  'components/satoshinet/swap/Swap.tsx',
  'components/satoshinet/swap/RemoveLiquidity.tsx',
  'components/satoshinet/swap/Stack.tsx',
  'components/satoshinet/swap/WithDraw.tsx',
  'components/satoshinet/swap/Deposit.tsx',
  'components/launchpool/JoinPool.tsx',
  'components/launchpool/CreatePoolAdvanced.tsx',
  'components/launchpool/CreatePoolBasic.tsx',
  'components/launchpool/DistributionList.tsx',
  'components/account/ReferrerRegister.tsx',
  'components/account/ReferrerBind.tsx',
  'components/account/SellOrderModal.tsx',
  'components/account/OrdxOrderList.tsx',

  // 服务和工具文件
  'infrastructure/api/amm.ts',
  'lib/hooks/useSupportedContracts.ts',
  'application/useAssetBalanceService.ts'
];

// ==================== 最佳实践建议 ====================

/**
 * Sat20 API 使用建议
 */
export const Sat20BestPractices = {
  // 1. 错误处理
  errorHandling: `
    try {
      const result = await window.sat20.someMethod(params);
      if (result.success) {
        // 处理成功结果
      } else {
        // 处理错误
        console.error('Sat20 API error:', result.error);
      }
    } catch (error) {
      console.error('Sat20 API exception:', error);
    }
  `,

  // 2. 网络检查
  networkCheck: `
    // 在调用合约方法前检查网络状态
    const currentNetwork = await window.sat20.getNetwork();
    if (currentNetwork !== expectedNetwork) {
      await window.sat20.switchNetwork(expectedNetwork);
    }
  `,

  // 3. 费率设置
  feeRateHandling: `
    // 使用合理的费率
    const feeRate = await window.sat20.getRecommendedFeeRate();
    // 或使用自定义费率
    const customFeeRate = { value: 10 };
  `,

  // 4. 参数验证
  parameterValidation: `
    // 在调用API前验证参数
    if (!address || !assetName || amount <= 0) {
      throw new Error('Invalid parameters');
    }
  `,

  // 5. 异步操作
  asyncHandling: `
    // 使用async/await处理异步操作
    const handleSat20Call = async () => {
      setLoading(true);
      try {
        const result = await window.sat20.someMethod(params);
        // 处理结果
      } catch (error) {
        // 处理错误
      } finally {
        setLoading(false);
      }
    };
  `
};

export default {
  NetworkMethods,
  ContractMethods,
  AssetMethods,
  UTXOMethods,
  OrderMethods,
  ReferralMethods,
  MethodUsageStats,
  Sat20UsageFiles,
  Sat20BestPractices
};