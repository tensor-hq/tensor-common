import { PublicKey } from '@solana/web3.js';

export const HADESWAP_ADDR = new PublicKey(
  'hadeK9DLv9eA7ya5KCTqSvSvRZeJC3JgD5a9Y3CNbvu',
);
export const HADESWAP_FEE_PREFIX = 'fee_vault';

export enum HadeswapOrderType {
  Buy = 'buy',
  Sell = 'sell',
}

export enum HadeswapBondingCurveType {
  Linear = 'linear',
  Exponential = 'exponential',
  XYK = 'xyk',
}
