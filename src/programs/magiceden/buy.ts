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
      .get<{ sellerReferral?: string; seller: string }[]>(
        `${ME_URL}/v2/tokens/${tokenMint}/listings`,
      )
      .then(
        (res) =>
          // If cannot find by seller, fallback to first listing (probably correct).
          (res.data.find((l) => l.seller === seller) ?? res.data.at(0))
            ?.sellerReferral,
      )
      .catch((_err) => undefined),
  ]);
  console.debug(`found referral ${sellerReferral}`);

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
