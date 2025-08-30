# RefetchInterval 优化总结

## 问题描述
项目中存在大量的 `useQuery` 使用 `refetchInterval` 进行自动刷新，导致以下问题：
1. 界面活跃时持续刷新，消耗大量内存
2. 后台标签页也在刷新，浪费资源
3. 刷新频率过高，可能导致内存崩溃

## 优化策略

### 1. 增加刷新间隔
- **原来**: 3-6秒刷新一次
- **现在**: 10秒-5分钟刷新一次
- **原则**: 根据数据重要性调整刷新频率

### 2. 禁止后台刷新
- 为所有 `useQuery` 添加 `refetchIntervalInBackground: false`
- 确保只有在用户活跃的标签页才进行刷新

### 3. 具体优化内容

#### Hook 级别优化
- `useLimitOrderDetailData.ts`: 15秒-2分钟
- `useSwapDetailData.ts`: 15秒-2分钟  
- `useTranscendDetailData.ts`: 15秒-2分钟
- `useAmmPoolService.ts`: 10秒
- `useAssetBalanceService.ts`: 15秒
- `useAssets.ts`: 15秒
- `useHeight.ts`: 10秒

#### 页面级别优化
- `app/market/page.tsx`: 2分钟
- `app/transcend/page.tsx`: 2分钟
- `app/swap/page.tsx`: 2分钟
- `app/launchpool/page.tsx`: 2分钟
- `app/transcend/create/page.tsx`: 15秒
- `app/swap/create/page.tsx`: 15秒

#### 组件级别优化
- `MyOrders.tsx`: 10秒
- `HistorySwapOrders.tsx`: 10秒
- `HistoryTranscendOrders.tsx`: 10秒
- `MyTranscendOrders.tsx`: 10秒
- `MySwapOrders.tsx`: 10秒
- `HistoryOrders.tsx`: 10秒
- `ActivityLog.tsx`: 20秒
- `MyActivitiesLog.tsx`: 20秒
- `TakeOrder.tsx`: 30秒
- `Deposit.tsx`: 20秒
- `CreateLimitOrder.tsx`: 15秒
- `CreatePoolAdvanced.tsx`: 15秒
- `CreatePool.23.tsx`: 15秒
- `UpdateVersionModal.tsx`: 5分钟
- `BtcFeerateSelectButton.tsx`: 10分钟
- `FeerateSelectButton.tsx`: 10分钟
- `AssetTransfersPanel.tsx`: 2分钟

## 优化效果

### 内存使用优化
- 减少不必要的后台刷新
- 降低内存占用峰值
- 避免内存泄漏

### 性能优化
- 减少网络请求频率
- 降低服务器压力
- 提升用户体验

### 用户体验优化
- 保持重要数据的实时性
- 减少不必要的加载状态
- 提高应用响应速度

## 建议

1. **监控效果**: 建议监控优化后的内存使用情况
2. **用户反馈**: 关注用户对数据更新频率的反馈
3. **进一步优化**: 可以考虑根据用户行为动态调整刷新频率
4. **缓存策略**: 结合 `staleTime` 和 `gcTime` 进一步优化缓存策略

## 注意事项

- 所有修改都添加了 `refetchIntervalInBackground: false`
- 保持了重要数据的实时性
- 对于不太重要的数据，大幅增加了刷新间隔
- 添加了详细的注释说明优化原因
