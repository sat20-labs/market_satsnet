import React from "react";

const BuySellToggle = ({
  mode,
  onChange,
  disableSell = false, // 新增参数，用于禁用 Sell 按钮
  disableBuy = false, // 新增参数，用于禁用 Buy 按钮
}: {
  mode: "buy" | "sell";
  onChange: (val: "buy" | "sell") => void;
  disableSell?: boolean;
  disableBuy?: boolean;
}) => {
  return (
    <div className="inline-flex my-6 rounded-lg overflow-hidden border border-gray-600 w-full">
      <button
        onClick={() => !disableBuy && onChange("buy")} // 禁用时不触发 onChange
        className={`w-full px-4 py-2 text-sm font-medium ${
          mode === "buy" ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-400"
        }`}
      >
        Buy
      </button>
      <button
        onClick={() => !disableSell && onChange("sell")} // 禁用时不触发 onChange
        disabled={disableSell} // 禁用 Sell 按钮
        className={`w-full px-4 py-2 text-sm font-medium ${
          mode === "sell"
            ? disableSell
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" // 禁用时样式
              : "bg-zinc-600 text-white"
            : "bg-zinc-800 text-zinc-400"
        }`}
      >
        Sell
      </button>
    </div>
  );
};

export default BuySellToggle;