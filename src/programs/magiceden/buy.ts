import { makeMEHeaders, METxSigned, ME_AH_ADDRESS, ME_URL } from './shared';
import Big from 'big.js';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export const makeMEBuyTx = async ({
  tokenMint,
  buyer,
  seller,
  priceLamports,
  apiKey,
}: {
  tokenMint: string;
  buyer: string;
  seller: string;
  priceLamports: Big;
  apiKey: string;
}): Promise<METxSigned> => {
  const price = priceLamports.div(LAMPORTS_PER_SOL).toNumber();

  const [tokenAccount, sellerReferral] = await Promise.all([
    getAssociatedTokenAddress(new PublicKey(tokenMint), new PublicKey(seller)),
    await axios
      .get<{ sellerReferral?: string; price: number }[]>(
        `${ME_URL}/v2/tokens/${tokenMint}/listings`,
      )
      .then((res) => res.data.find((l) => l.price === price)?.sellerReferral)
      .catch((_err) => undefined),
  ]);

  const { data } = await axios({
    url: `${ME_URL}/v2/instructions/buy_now`,
    method: 'GET',
    params: {
      buyer,
      seller,
      auctionHouseAddress: ME_AH_ADDRESS,
      tokenMint,
      tokenATA: tokenAccount.toBase58(),
      price,
      sellerReferral,
      sellerExpiry: '-1',
    },
    headers: makeMEHeaders(apiKey),
  });

  return data.txSigned.data;
};
