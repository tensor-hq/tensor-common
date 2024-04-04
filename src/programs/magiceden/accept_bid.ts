import { makeMEHeaders, METxSigned, ME_AH_ADDRESS, ME_URL } from './shared';
import Big from 'big.js';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export const makeMEAcceptBidTx = async ({
  tokenMint,
  buyer,
  seller,
  priceLamports,
  newPriceLamports,
  apiKey,
}: {
  tokenMint: string;
  buyer: string;
  seller: string;
  priceLamports: Big;
  newPriceLamports: Big;
  apiKey: string;
}): Promise<METxSigned> => {
  const price = priceLamports.div(LAMPORTS_PER_SOL).toNumber();
  const newPrice = newPriceLamports.div(LAMPORTS_PER_SOL).toNumber();

  const tokenAccount = await getAssociatedTokenAddress(
    new PublicKey(tokenMint),
    new PublicKey(seller),
  );

  const { data } = await axios.get(`${ME_URL}/v2/instructions/sell_now`, {
    params: {
      buyer,
      seller,
      auctionHouseAddress: ME_AH_ADDRESS,
      tokenMint,
      tokenATA: tokenAccount.toBase58(),
      price,
      newPrice,
      sellerExpiry: '-1',
    },
    headers: makeMEHeaders(apiKey),
  });

  return data.txSigned.data;
};
