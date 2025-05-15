// Status definitions
export enum PoolStatus {
  NOT_STARTED = "not_started", // Not started
  ACTIVE = "active",           // Active
  FULL = "full",               // Full
  DISTRIBUTING = "distributing", // Distributing
  COMPLETED = "completed",     // Completed
  EXPIRED = "expired",         // Expired
  EXPIRED_UNFILLED = "expired_unfilled", // Expired but not filled
}

// Status text mapping
export const statusTextMap: Record<string, string> = {
  [PoolStatus.NOT_STARTED]: "Not Started",
  [PoolStatus.ACTIVE]: "Active",
  [PoolStatus.FULL]: "Full",
  [PoolStatus.DISTRIBUTING]: "Distributing",
  [PoolStatus.COMPLETED]: "Completed",
  [PoolStatus.EXPIRED]: "Expired",
  [PoolStatus.EXPIRED_UNFILLED]: "Expired (Unfilled)",
};

// Status color mapping
export const statusColorMap: Record<string, string> = {
  [PoolStatus.NOT_STARTED]: "bg-gray-500",
  [PoolStatus.ACTIVE]: "bg-green-500",
  [PoolStatus.FULL]: "bg-blue-500",
  [PoolStatus.DISTRIBUTING]: "bg-purple-500",
  [PoolStatus.COMPLETED]: "bg-teal-500",
  [PoolStatus.EXPIRED]: "bg-red-500",
  [PoolStatus.EXPIRED_UNFILLED]: "bg-orange-500",
};
