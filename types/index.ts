import {SVGProps} from "react";
export * from './order';
export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type Env = 'dev' | 'test' | 'prod';
export enum Chain {
  BTC = 'btc',
  SATNET = 'satnet',
}

// LPT (Liquidity Provider Token) 数据结构
export interface LptAmount {
  Value: number;
  Precision: number;
}

// 用户合约状态中的各种金额数据结构
export interface ContractAmount {
  Value: number;
  Precision: number;
}

// 用户合约状态数据结构
export interface UserContractStatus {
  code: number;
  msg: string;
  status: string; // JSON 字符串，需要解析
}

// 解析后的合约状态数据
export interface ParsedContractStatus {
  status: {
    InvokeCount: number;
    OnSaleAmt: ContractAmount;
    OnBuyValue: number;
    DealAmt: ContractAmount;
    DealValue: number;
    RefundAmt: ContractAmount;
    RefundValue: number;
    DepositAmt: ContractAmount;
    DepositValue: number;
    WithdrawAmt: ContractAmount;
    WithdrawValue: number;
    ProfitAmt: ContractAmount;
    ProfitValue: number;
    StakeAmt: ContractAmount;
    StakeValue: number;
    UnstakeAmt: ContractAmount;
    UnstakeValue: number;
    LptAmt: LptAmount;
    RetrieveAmt: ContractAmount;
    RetrieveValue: number;
  };
  onList: string[] | null;
  refund: string[] | null;
  deposit: string[] | null;
  withdraw: string[] | null;
  addLiq: string[] | null;
  removeLiq: string[] | null;
  stake: string[] | null;
  unstake: string[] | null;
}