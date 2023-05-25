import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import Big from 'big.js';
import { METxSigned, ME_AH_ADDRESS, ME_URL, makeMEHeaders } from './shared';

export const makeMEBuyTx = async ({
  tokenMint,
  tokenAcc,
  buyer,
  seller,
  priceLamports,
  apiKey,
  sellerReferral,
  expiry,
}: {
  tokenMint: string;
  tokenAcc: string;
  buyer: string;
  seller: string;
  priceLamports: string;
  apiKey: string;
  sellerReferral?: string;
  expiry?: number;
}): Promise<{
  txSigned: METxSigned;
  v0TxSigned?: METxSigned;
  lastValidBlockHeight: number;
}> => {
  const price = new Big(priceLamports).div(LAMPORTS_PER_SOL).toNumber();

  const { data } = await axios({
    url: `${ME_URL}/v2/instructions/buy_now`,
    method: 'GET',
    params: {
      buyer,
      seller,
      auctionHouseAddress: ME_AH_ADDRESS,
      tokenMint,
      tokenATA: tokenAcc,
      price,
      sellerReferral,
      sellerExpiry: expiry,
    },
    headers: makeMEHeaders(apiKey),
  });

  return {
    txSigned: data.txSigned.data,
    v0TxSigned: data.v0?.txSigned.data,
    lastValidBlockHeight: data.blockhashData.lastValidBlockHeight,
  };
};
