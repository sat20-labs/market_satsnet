// 状态定义
export enum PoolStatus {
  NOT_STARTED = "not_started", // 未开始
  ACTIVE = "active",           // 发布中
  FULL = "full",               // 池子已满
  DISTRIBUTING = "distributing", // 分发中
  COMPLETED = "completed",     // 已完成
  EXPIRED = "expired",         // 已过期
  EXPIRED_UNFILLED = "expired_unfilled", // 新增：过期未满状态
}

// 状态文本映射
export const statusTextMap: Record<string, string> = {
  [PoolStatus.NOT_STARTED]: "未开始",
  [PoolStatus.ACTIVE]: "发布中",
  [PoolStatus.FULL]: "池子已满",
  [PoolStatus.DISTRIBUTING]: "分发中",
  [PoolStatus.COMPLETED]: "已完成",
  [PoolStatus.EXPIRED]: "已过期",
  [PoolStatus.EXPIRED_UNFILLED]: "过期未满",
};

// 状态颜色映射
export const statusColorMap: Record<string, string> = {
  [PoolStatus.NOT_STARTED]: "bg-gray-500",
  [PoolStatus.ACTIVE]: "bg-green-500",
  [PoolStatus.FULL]: "bg-blue-500",
  [PoolStatus.DISTRIBUTING]: "bg-purple-500",
  [PoolStatus.COMPLETED]: "bg-teal-500",
  [PoolStatus.EXPIRED]: "bg-red-500",
  [PoolStatus.EXPIRED_UNFILLED]: "bg-orange-500",
};
