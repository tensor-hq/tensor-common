import { makeMEHeaders, METxSigned, ME_AH_ADDRESS, ME_URL } from './shared';
import Big from 'big.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';

export const makeMECancelBidTx = async ({
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

  let buyerReferral: string | undefined = undefined;
  let offset = 0;
  while (true) {
    const { data } = await axios.get<
      { buyerReferral?: string; tokenMint: string }[]
    >(`${ME_URL}/v2/wallets/${buyer}/offers_made?offset=${offset}&limit=500`);
    if (data.length === 0) break;
    offset += data.length;
    const temp = data.find((b) => b.tokenMint === tokenMint);
    if (temp?.buyerReferral) {
      buyerReferral = temp.buyerReferral;
      break;
    }
  }

  const { data } = await axios.get(`${ME_URL}/v2/instructions/buy_cancel`, {
    params: {
      buyer,
      auctionHouseAddress: ME_AH_ADDRESS,
      tokenMint,
      price,
      buyerReferral,
      sellerExpiry: '-1',
    },
    headers: makeMEHeaders(apiKey),
  });

  return data.txSigned.data;
};
