import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import Big from 'big.js';
import { METxSigned, ME_AH_ADDRESS, ME_URL, makeMEHeaders } from './shared';

export const makeMEDelistTx = async ({
  tokenMint,
  tokenOwner,
  tokenAccount,
  priceLamports,
  apiKey,
  expiry,
}: {
  tokenMint: string;
  tokenOwner: string;
  tokenAccount: string;
  priceLamports: string;
  apiKey: string;
  expiry?: number;
}): Promise<METxSigned> => {
  const price = new Big(priceLamports).div(LAMPORTS_PER_SOL).toNumber();

  const { data } = await axios({
    url: `${ME_URL}/v2/instructions/sell_cancel`,
    method: 'GET',
    params: {
      seller: tokenOwner,
      auctionHouseAddress: ME_AH_ADDRESS,
      tokenMint,
      tokenAccount,
      price, //yes have to pass actual listing price - random number doesn't work
      expiry,
    },
    headers: makeMEHeaders(apiKey),
  });

  return data.txSigned.data;
};
