import { makeMEHeaders, METxSigned, ME_AH_ADDRESS, ME_URL } from './shared';
import Big from 'big.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';

export const makeMEBidTx = async ({
  tokenMint,
  buyer,
  priceLamports,
  apiKey,
}: {
  tokenMint: string;
  buyer: string;
  priceLamports: Big;
  apiKey: string;
}): Promise<METxSigned> => {
  const price = priceLamports.div(LAMPORTS_PER_SOL).toNumber();

  const { data } = await axios.get(`${ME_URL}/v2/instructions/buy`, {
    params: {
      buyer,
      auctionHouseAddress: ME_AH_ADDRESS,
      tokenMint,
      price,
      sellerExpiry: '-1',
    },
    headers: makeMEHeaders(apiKey),
  });

  return data.txSigned.data;
};
