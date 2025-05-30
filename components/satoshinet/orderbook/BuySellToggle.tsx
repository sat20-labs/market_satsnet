import React from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from 'react-i18next';

const BuySellToggle = ({
  mode,
  onChange,
  disableSell = false,
  disableBuy = false,
  source = 'takeorder' // Default source is 'makeorder', can be 'markorder' or others
}: {
  mode: "buy" | "sell";
  onChange: (val: "buy" | "sell") => void;
  disableSell?: boolean;
  disableBuy?: boolean;
  source?: string;
}) => {
  console.log(`BuySellToggle rendered with mode: ${mode}, source: ${source}`); // Debugging line
  const { t ,ready} = useTranslation();

  // Dynamically determine the translation key based on source and mode
  const getBuyLabel = () => {
    const translationKey = `common.${source}_buy`;
    console.log(`Translation key for buy: ${translationKey}`); // Debugging line
    return t(translationKey, 'Buy'); // Fallback to 'Buy' if translation not found
  };

  const getSellLabel = () => {
    const translationKey = `common.${source}_sell`;
    console.log(`Translation key for sell: ${translationKey}`); // Debugging line
    return t(translationKey, 'Sell'); // Fallback to 'Sell' if translation not found
  };

  return (
    <div className="inline-flex my-6 rounded-lg overflow-hidden  w-full">
      <button
        onClick={() => !disableBuy && onChange("buy")}
        disabled={disableBuy}
        className={`flex justify-center w-full gap-1 px-4 py-2 text-sm font-medium ${
          mode === "buy"
            ? "btn-gradient text-white"
            : "bg-zinc-800 text-zinc-400"
        } ${disableBuy ? "cursor-not-allowed" : ""}`}
      >
        <Icon icon='ion:arrow-down-circle' className='w-5 h-5'/> {getBuyLabel()}
      </button>
      <button
        onClick={() => !disableSell && onChange("sell")}
        disabled={disableSell}
        className={`flex justify-center w-full gap-1 px-4 py-2 text-sm font-medium ${
          mode === "sell"
            ? disableSell
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "btn-gradient text-white"
            : "bg-zinc-800 text-zinc-400"
        }`}
      >
       <Icon icon='ion:arrow-up-circle' className='w-5 h-5'/> {getSellLabel()}
      </button>
    </div>
  );
};

export default BuySellToggle;