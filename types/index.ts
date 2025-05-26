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