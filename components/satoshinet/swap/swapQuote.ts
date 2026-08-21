export type SwapDirection = 'asset-to-sats' | 'sats-to-asset';

interface SwapQuoteInput {
  direction: SwapDirection;
  grossReceive: number;
  serviceFee: number;
  networkFee: number;
}

export interface SwapQuoteResult {
  netReceive: number;
  canSubmit: boolean;
}

export function evaluateSwapQuote({
  direction,
  grossReceive,
  serviceFee,
  networkFee,
}: SwapQuoteInput): SwapQuoteResult {
  if (![grossReceive, serviceFee, networkFee].every(Number.isFinite)) {
    return { netReceive: 0, canSubmit: false };
  }

  const safeGrossReceive = Math.max(0, Math.floor(grossReceive));
  if (direction === 'sats-to-asset') {
    return {
      netReceive: safeGrossReceive,
      canSubmit: safeGrossReceive > 0,
    };
  }

  const netReceive = Math.max(
    0,
    safeGrossReceive - Math.max(0, serviceFee) - Math.max(0, networkFee),
  );
  return {
    netReceive,
    canSubmit: netReceive > 0,
  };
}
