import { getWalletAdapter } from '@/lib/walletAdapter';

const CONTRACT_TYPE_AGENT = 'agent';
const PREDICTION_BET_ACTION = 'bet';
const DEFAULT_AGENT_GAS_LIMIT = 100000;

type AgentPredictionBetParam = {
  outcome_id: string;
};

type InvokeParam = {
  action: string;
  param: string;
};

export function buildPredictionBetInvokeParam(outcomeID: string): string {
  const param: AgentPredictionBetParam = {
    outcome_id: outcomeID,
  };
  const invoke: InvokeParam = {
    action: PREDICTION_BET_ACTION,
    param: JSON.stringify(param),
  };
  return JSON.stringify(invoke);
}

export function buildPredictionBetRequest(
  contractAddress: string,
  outcomeID: string,
  betAssetName: string,
  betAmount: string,
) {
  return {
    ContractType: CONTRACT_TYPE_AGENT,
    Agent: {
      ContractAddress: contractAddress,
      JSONInvokeParam: buildPredictionBetInvokeParam(outcomeID),
      BetAssetName: betAssetName,
      BetAmount: betAmount,
      GasLimit: DEFAULT_AGENT_GAS_LIMIT,
    },
  };
}

export function invokePredictionBet(
  contractAddress: string,
  outcomeID: string,
  betAssetName: string,
  betAmount: string,
) {
  const req = buildPredictionBetRequest(contractAddress, outcomeID, betAssetName, betAmount);
  return getWalletAdapter().invokeUnifiedContract(req);
}
