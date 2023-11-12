import Big from 'big.js';
import { HadeswapBondingCurveType, HadeswapOrderType } from './constants';

// NB: copied from https://github.com/hadeswap-solana/hadeswap-sdk-public/blob/66ab430a7a11bd014804d48a7f5d2e7fd906f9ac/src/hadeswap-core/helpers.ts#L86
export const calculateNextSpotPrice = ({
  orderType,
  spotPrice,
  delta,
  bondingCurveType,
  counter,
}: {
  orderType: HadeswapOrderType;
  spotPrice: number;
  delta: number;
  bondingCurveType: HadeswapBondingCurveType;
  counter: number;
}): number => {
  if (bondingCurveType === HadeswapBondingCurveType.Linear) {
    let current_price = spotPrice; // 1

    const targetCounter =
      counter + (orderType === HadeswapOrderType.Buy ? 1 : -1);
    if (targetCounter >= 0) {
      // 0
      for (let i = 0; i < Math.abs(targetCounter); i++) {
        current_price += delta;
      }
    } else {
      for (let i = 0; i < Math.abs(targetCounter); i++) {
        current_price -= delta;
      }
    }
    return current_price;
  } else if (bondingCurveType === HadeswapBondingCurveType.Exponential) {
    const newCounter =
      orderType === HadeswapOrderType.Buy ? counter + 1 : counter - 1;
    let newDelta =
      newCounter > 0 ? (delta + 1e4) / 1e4 : 1 / ((delta + 1e4) / 1e4);

    return spotPrice * Math.pow(newDelta, Math.abs(newCounter));
  } else if (bondingCurveType === HadeswapBondingCurveType.XYK) {
    // const deltaCorrected = delta - counter;

    const nftTokensBalance = delta * spotPrice;
    const counterUpdated =
      orderType === HadeswapOrderType.Buy ? counter : counter - 1;
    const currentDelta = delta + 1 - counterUpdated;
    const diffAmount = (counterUpdated * nftTokensBalance) / currentDelta;
    const newNftTokensBalance = nftTokensBalance + diffAmount;

    return orderType === HadeswapOrderType.Buy
      ? newNftTokensBalance / (currentDelta - 1)
      : newNftTokensBalance / (currentDelta + 1);
  }
  return 0;
};

export const computeHswapTakerPrice = ({
  takerSide,
  config,
  extraNFTsSelected,
}: {
  takerSide: 'Buy' | 'Sell';
  config: {
    mathCounter: number;
    baseSpotPrice: number;
    curveType: 'linear' | 'exponential' | 'xyk';
    delta: number;
    feeBps: number;
  };
  extraNFTsSelected: number;
}): Big | null => {
  const price = calculateNextSpotPrice({
    orderType:
      takerSide === 'Buy' ? HadeswapOrderType.Buy : HadeswapOrderType.Sell,
    spotPrice: config.baseSpotPrice,
    delta: config.delta,
    bondingCurveType:
      config.curveType === 'linear'
        ? HadeswapBondingCurveType.Linear
        : config.curveType === 'exponential'
        ? HadeswapBondingCurveType.Exponential
        : HadeswapBondingCurveType.XYK,
    counter:
      config.mathCounter +
      // Gotta add 1 to counter for sells lol.
      (takerSide === 'Buy' ? 0 : 1) +
      (takerSide === 'Buy' ? 1 : -1) * extraNFTsSelected,
  });

  // This can happen with XYK pools (when we go past the allowable amount).
  if (isNaN(price) || !isFinite(price)) return null;

  return new Big(price)
    .mul(1 + ((takerSide === 'Buy' ? 1 : -1) * config.feeBps) / 100_00)
    .round();
};
