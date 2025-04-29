import { useCommonStore } from "@/store";
import { useMemo } from "react";
export const useQueryKey = (key: (string | undefined | null)[]) => {
  const { chain: ctxChain, network: ctxNetwork } = useCommonStore.getState();
  return useMemo(() => [...key, ctxChain, ctxNetwork], [key, ctxChain, ctxNetwork]);
};
