import { hadeswap } from '@tensor-hq/hadeswap-sdk-public';
import Big from 'big.js';
const {
  types: { OrderType, BondingCurveType },
  helpers: { calculateNextSpotPrice },
} = hadeswap;

export const computeHswapTakerPrice = ({
  takerSide,
  config,
  extraNFTsSelected,
}: {
  takerSide: 'buy' | 'sell';
  config: {
    mathCounter: number;
    baseSpotPrice: number;
    curveType: 'linear' | 'exponential';
    delta: number;
    feeBps: number;
  };
  extraNFTsSelected: number;
}): Big => {
  const price = calculateNextSpotPrice({
    orderType: takerSide === 'buy' ? OrderType.Buy : OrderType.Sell,
    spotPrice: config.baseSpotPrice,
    delta: config.delta,
    bondingCurveType:
      config.curveType === 'linear'
        ? BondingCurveType.Linear
        : BondingCurveType.Exponential,
    counter:
      config.mathCounter + (takerSide === 'buy' ? 1 : -1) * extraNFTsSelected,
  });
  return new Big(price)
    .mul(1 + ((takerSide === 'buy' ? 1 : -1) * config.feeBps) / 100_00)
    .round();
};
