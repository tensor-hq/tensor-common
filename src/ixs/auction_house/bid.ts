/*
place bid (for now native only)
https://solscan.io/tx/4XbkMExfhhbgRizdiQB9zS3N6sDfwkvfEuPjwRTcX3VnmBGWiDeFejtB2isiDC9H8dYriwEV1TrYkSDDwiGH6DD
deposit + buy + transfer
 */

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  getAuctionHouseBuyerEscrow,
  getAuctionHouseTradeState,
  getQuantityWithMantissa,
} from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createBuyInstruction,
  createDepositInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import { findMetadataPda } from '@metaplex-foundation/js';

export const makeAHBidTx = async (
  connection: Connection,
  tokenMint: string,
  bidder: string,
  auctionHouse: string,
  priceLamports: BN,
  totalDepositLamports?: BN,
  tokenSize = 1,
): Promise<{ tx: Transaction }> => {
  const price = priceLamports.div(new BN(LAMPORTS_PER_SOL)).toNumber();
  const totalDeposit = totalDepositLamports
    ?.div(new BN(LAMPORTS_PER_SOL))
    .toNumber();

  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const bidderKey = new PublicKey(bidder);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const buyPriceAdjusted = new BN(
    await getQuantityWithMantissa(
      connection,
      price,
      auctionHouseObj.treasuryMint,
    ),
  );

  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(connection, tokenSize, mintKey),
  );

  const totalDepositAdjusted = totalDeposit
    ? new BN(
        await getQuantityWithMantissa(
          connection,
          totalDeposit,
          auctionHouseObj.treasuryMint,
        ),
      )
    : undefined;

  //this is supposed to be the account holding the NFT
  const largestTokenHolders = await connection.getTokenLargestAccounts(mintKey);
  const tokenAccountKey = largestTokenHolders.value[0].address;

  const [tradeState, tradeStateBump] = await getAuctionHouseTradeState(
    auctionHouseKey,
    bidderKey,
    tokenAccountKey,
    //@ts-ignore
    auctionHouseObj.treasuryMint,
    mintKey,
    tokenSizeAdjusted,
    buyPriceAdjusted,
  );

  const [escrowPaymentAccount, escrowPaymentBump] =
    await getAuctionHouseBuyerEscrow(auctionHouseKey, bidderKey);

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
      buyerPrice: buyPriceAdjusted,
      escrowPaymentBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump,
    },
  );

  const tx = new Transaction();

  //(!) optional deposit ix:
  //  - if not included, AH is smart enough to top up the account with minimum required during buyIx
  //  - if included in the SAME tx, the buyIx will deposit that much less (0 if min fully covered)
  if (totalDepositAdjusted) {
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
        amount: totalDepositAdjusted,
        escrowPaymentBump,
      },
    );

    tx.add(depositIx);
  }

  tx.add(buyIx);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = bidderKey;

  return { tx };
};
