import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface MakeOrderProps {
    mode: "buy" | "sell";
    setMode: (mode: "buy" | "sell") => void;
    userWallet: { btcBalance: number; assetBalance: number };
    assetInfo: { assetLogo: string; assetName: string; AssetId: string; floorPrice: number };
}

const MakeOrder = ({ mode, setMode, userWallet, assetInfo }: MakeOrderProps) => {
    const [quantity, setQuantity] = useState<number | "">("");
    const [price, setPrice] = useState<number | "">("");

    // 计算用户需要支付的 BTC 或可以获得的收入
    const calculatedBTC = (quantity as number) * (price as number);

    // 校验逻辑
    const isBuyValid = mode === "buy" && userWallet.btcBalance >= calculatedBTC && calculatedBTC > 0;
    const isSellValid =
        mode === "sell" &&
        (quantity as number) <= userWallet.assetBalance &&
        (quantity as number) > 0;

    // 切换模式时清除已填写的数据
    useEffect(() => {
        setQuantity("");
        setPrice("");
    }, [mode]);

    // 处理点击 "Max" 按钮
    const handleMaxClick = () => {
        if (mode === "sell") {
            setQuantity(userWallet.assetBalance);
        }
    };

    return (
        <div>
            {/* Asset Information */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
                <img src={assetInfo.assetLogo} alt={assetInfo.assetName} className="w-10 h-10 rounded-full" />
                <div className="leading-relaxed">
                    <p className="text-sm sm:text-base text-zinc-200 font-medium">{assetInfo.assetName} <span className="text-zinc-500 text-sm">({assetInfo.AssetId})</span></p>
                    {mode === "buy" ? (
                        <p className="text-sm text-gray-400">Floor Price: {assetInfo.floorPrice.toFixed(6)} BTC</p>
                    ) : (
                        <p className="text-sm text-gray-400">
                            Your Balance: {userWallet.assetBalance}
                        </p>
                    )}
                </div>
            </div>

            {/* Quantity Input */}
            <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">
                    {mode === "buy" ? "Quantity to Buy:" : "Quantity to Sell:"}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        placeholder="Enter quantity"
                        className="w-full bg-zinc-800 text-zinc-200 p-2 rounded"
                    />
                    {mode === "sell" && (
                        <button
                            onClick={handleMaxClick}
                            className="px-2 py-2 h-10 bg-zinc-800 text-zinc-300 text-sm rounded hover:bg-zinc-600"
                        >
                            Max
                        </button>
                    )}
                    <span className="text-sm text-gray-400">
                        {assetInfo.assetName}
                    </span>

                </div>
            </div>

            {/* Price Input */}
            <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-1">Unit Price:</label>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        placeholder="Enter price"
                        className="w-full bg-zinc-800 text-white p-2 rounded"
                    />
                    <span className="text-sm text-gray-400">BTC/{assetInfo.assetName}</span>
                </div>
            </div>

            <div className="gap-2 mb-4 bg-zinc-800/50 rounded-lg p-4">
                {/* Balance Display */}
                {mode === "buy" && (
                    <p className="flex justify-between gap-1 text-sm text-gray-400 mt-4">
                        <span>Available BTC Balance: </span>
                        <span className="flex justify-start gap-1"><Icon icon="cryptocurrency-color:btc" className="mr-1 mt-0.5" />{userWallet.btcBalance.toFixed(6)} </span>
                    </p>
                )}
                {mode === "sell" && (
                    <p className="flex justify-start gap-1 text-sm text-gray-400 mt-4">
                        <span>Available Asset Balance: </span> 
                        <span className="gap-1">{userWallet.assetBalance} {assetInfo.assetName}</span>
                    </p>
                )}

                {/* Validation Messages */}
                {mode === "buy" && !isBuyValid && (
                    <p className="text-red-500 text-sm font-medium">
                        Insufficient BTC balance for this order.
                    </p>
                )}
                {mode === "sell" && !isSellValid && (
                    <p className="text-red-500  text-sm font-medium">
                        Invalid quantity. Ensure it is less than or equal to your available
                        balance.
                    </p>
                )}

                {/* Summary */}
                {quantity && price && (
                    <div className="mt-4 py-4">
                        <p className="font-medium text-gray-400">
                            {mode === "buy"
                                ? `You will pay: ${calculatedBTC.toFixed(6)} BTC`
                                : `You will receive:  ${calculatedBTC.toFixed(6)} BTC`
                            }
                        </p>
                    </div>
                )}
            </div>
            {/* Action Button */}
            <button
                className={`w-full mt-4 py-3 rounded-xl text-zinc-200 text-sm font-semibold ${!isBuyValid && mode === "buy"
                        ? "bg-gray-700 cursor-not-allowed"
                        : !isSellValid && mode === "sell"
                            ? "bg-gray-700 cursor-not-allowed"
                            : mode === "buy"
                                ? "btn-gradient"
                                : "btn-gradient hover:bg-zinc-700"
                    }`}
                disabled={(mode === "buy" && !isBuyValid) || (mode === "sell" && !isSellValid)}
            >
                {mode === "buy" ? "Buy" : "Sell"}
            </button>
        </div>
    );
};

export default MakeOrder;