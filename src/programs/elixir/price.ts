import Big from 'big.js';
import { BASE_TOKENS_PER_NFT } from './constants';
import { isNullLike } from '../../utils';

const ELIXIR_FEE_BPS = 250;
const RAYDIUM_FEE_BPS = 25;
//25bps margin of safety
const TOTAL_FEE = ELIXIR_FEE_BPS + RAYDIUM_FEE_BPS + 25;

export const computeElixirTakerPrice = ({
  takerSide,
  config,
  extraNFTsSelected,
}: {
  takerSide: 'Buy' | 'Sell';
  config: {
    buyPrices: Big[] | null;
    sellPrices: Big[] | null;
  };
  extraNFTsSelected: number;
}): Big | null => {
  if (takerSide === 'Buy') {
    if (isNullLike(config.buyPrices)) return null;
    return config.buyPrices.at(extraNFTsSelected) ?? null;
  } else {
    if (isNullLike(config.sellPrices)) return null;
    return config.sellPrices.at(extraNFTsSelected) ?? null;
  }
};

export const computeElixirTakerPriceRaydium = ({
  takerSide,
  config: { baseLiquidity, quoteLiquidity },
  extraNFTsSelected,
}: {
  takerSide: 'Buy' | 'Sell';
  config: {
    baseLiquidity: Big;
    quoteLiquidity: Big;
  };
  extraNFTsSelected: number;
}): Big | null => {
  //we always add 1 nft, so that if extraselected = 0, we get price for 1
  const buyNfts = takerSide === 'Buy' ? extraNFTsSelected + 1 : 0;
  const sellNfts = takerSide === 'Sell' ? extraNFTsSelected + 1 : 0;

  const k = baseLiquidity.mul(quoteLiquidity);

  const newPoolBaseTokens = baseLiquidity.add(
    new Big(sellNfts - buyNfts).mul(BASE_TOKENS_PER_NFT),
  );

  if (newPoolBaseTokens.lte(0)) {
    // this should never happen given we have nftSaleCap, but to avoid FE breaking returning 0 rather than error
    return null;
  }

  const newPoolQuoteTokens = k.div(newPoolBaseTokens);
  const priceWithoutFee = newPoolQuoteTokens
    .sub(quoteLiquidity)
    .abs()
    .div(extraNFTsSelected + 1);

  return takerSide === 'Buy'
    ? priceWithoutFee.div(1 - TOTAL_FEE / 10000)
    : priceWithoutFee.mul(1 - TOTAL_FEE / 10000);
};

/// Max # of nfts you can buy from the elixir pool.
export const computeElixirSaleCapRaydium = ({
  baseLiquidity,
}: {
  baseLiquidity: Big;
}) => {
  // Subtract 1 to ensure we don't go to 0 (impossible)
  return baseLiquidity
    .minus(1)
    .div(BASE_TOKENS_PER_NFT)
    .round(0, Big.roundDown)
    .toNumber();
};
