/*
place bid (for now native only)
https://solscan.io/tx/4XbkMExfhhbgRizdiQB9zS3N6sDfwkvfEuPjwRTcX3VnmBGWiDeFejtB2isiDC9H8dYriwEV1TrYkSDDwiGH6DD
deposit + buy + transfer
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { getQuantityWithMantissa } from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createBuyInstruction,
  createDepositInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
  toBigNumber,
} from '@metaplex-foundation/js';

export const makeAHBidTx = async (
  connection: Connection,
  tokenMint: string,
  bidder: string,
  auctionHouse: string,
  priceLamports: BN,
  totalDepositLamports?: BN,
  tokenSize = 1,
): Promise<{ tx: Transaction }> => {
  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const bidderKey = new PublicKey(bidder);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(connection, tokenSize, mintKey),
  );

  //this is supposed to be the account holding the NFT
  const largestTokenHolders = await connection.getTokenLargestAccounts(mintKey);
  const tokenAccountKey = largestTokenHolders.value[0].address;

  const tradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    bidderKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(priceLamports),
    toBigNumber(tokenSizeAdjusted),
    tokenAccountKey,
  );

  const escrowPaymentAccount = await findAuctionHouseBuyerEscrowPda(
    auctionHouseKey,
    bidderKey,
  );

  const buyIx = createBuyInstruction(
    {
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      authority: auctionHouseObj.authority,
      buyerTradeState: tradeState,
      escrowPaymentAccount,
      metadata: await findMetadataPda(mintKey),
      paymentAccount: bidderKey,
      tokenAccount: tokenAccountKey,
      transferAuthority: SystemProgram.programId, //as per OpenSea
      treasuryMint: auctionHouseObj.treasuryMint,
      wallet: bidderKey,
    },
    {
      buyerPrice: priceLamports,
      escrowPaymentBump: escrowPaymentAccount.bump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: tradeState.bump,
    },
  );

  const tx = new Transaction();

  //(!) optional deposit ix:
  //  - if not included, AH is smart enough to top up the account with minimum required during buyIx
  //  - if included in the SAME tx, the buyIx will deposit that much less (0 if min fully covered)
  if (totalDepositLamports) {
    const depositIx = createDepositInstruction(
      {
        auctionHouse: auctionHouseKey,
        auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
        authority: auctionHouseObj.authority,
        escrowPaymentAccount,
        paymentAccount: bidderKey,
        transferAuthority: auctionHouseObj.authority, //as per OpenSea
        treasuryMint: auctionHouseObj.treasuryMint,
        wallet: bidderKey,
      },
      {
        amount: totalDepositLamports,
        escrowPaymentBump: escrowPaymentAccount.bump,
      },
    );

    tx.add(depositIx);
  }

  tx.add(buyIx);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = bidderKey;

  return { tx };
};
