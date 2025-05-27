import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useContractStore } from "@/store/contract";

const getSupportedContracts = async () => {
  const result = await window.sat20.getSupportedContracts();
  const { contractContents = [] } = result;
  const list = contractContents.filter(Boolean).map((item) => {
    try {
      return JSON.parse(item);
    } catch (error) {
      return null;
    }
  }).filter(Boolean);
  return list;
};

export const useSupportedContracts = () => {
  const [contractType, setContractType] = useState<string | null>(null);
  const supportedContracts = useContractStore((state) => state.supportedContracts);
  const setSupportedContracts = useContractStore((state) => state.setSupportedContracts);

  const { data, isLoading, error } = useQuery({
    queryKey: ["supportedContracts"],
    queryFn: getSupportedContracts,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data && data.length > 0) {
      setContractType(data[0].contractType || null);
      setSupportedContracts(data.map((c: any) => c.contractType));
    }
  }, [data, setSupportedContracts]);

  return { contractType, supportedContracts, isLoading, error };
};