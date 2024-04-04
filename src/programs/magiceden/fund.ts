import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';
import Big from 'big.js';
import { makeMEHeaders, METxSigned, ME_AH_ADDRESS, ME_URL } from './shared';

export const makeMEDepositWithdrawTx = async (
  action: 'deposit' | 'withdraw',
  {
    owner,
    amountLamports,
    apiKey,
  }: { owner: string; amountLamports: Big; apiKey: string },
): Promise<METxSigned> => {
  const amount = amountLamports.div(LAMPORTS_PER_SOL).toNumber();

  const { data } = await axios.get(`${ME_URL}/v2/instructions/${action}`, {
    params: {
      buyer: owner,
      auctionHouseAddress: ME_AH_ADDRESS,
      amount,
    },
    headers: makeMEHeaders(apiKey),
  });

  return data.txSigned.data;
};
