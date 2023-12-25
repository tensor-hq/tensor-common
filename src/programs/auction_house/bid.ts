/*
place bid (for now native only)
https://solscan.io/tx/4XbkMExfhhbgRizdiQB9zS3N6sDfwkvfEuPjwRTcX3VnmBGWiDeFejtB2isiDC9H8dYriwEV1TrYkSDDwiGH6DD
deposit + buy + transfer
 */

import {
  AuctionHouse,
  createBuyInstruction,
  createDepositInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
} from '../../metaplex';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';
import { getQuantityWithMantissa } from './shared';

export const makeAHBidTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  bidder: string,
  auctionHouse: string,
  priceLamports: BN,
  totalDepositLamports?: BN,
  tokenSize = 1,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

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

  const [tradeState, tradeStateBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    bidderKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    priceLamports,
    tokenSizeAdjusted,
    tokenAccountKey,
  );

  const [escrowPaymentAccount, escrowPaymentAccountBump] =
    findAuctionHouseBuyerEscrowPda(auctionHouseKey, bidderKey);

  const buyIx = createBuyInstruction(
    {
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      authority: auctionHouseObj.authority,
      buyerTradeState: tradeState,
      escrowPaymentAccount,
      metadata: findMetadataPda(mintKey)[0],
      paymentAccount: bidderKey,
      tokenAccount: tokenAccountKey,
      transferAuthority: SystemProgram.programId, //as per OpenSea
      treasuryMint: auctionHouseObj.treasuryMint,
      wallet: bidderKey,
    },
    {
      buyerPrice: priceLamports,
      escrowPaymentBump: escrowPaymentAccountBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: tradeStateBump,
    },
  );

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
        escrowPaymentBump: escrowPaymentAccountBump,
      },
    );

    instructions.push(depositIx);
  }

  instructions.push(buyIx);

  return buildTx({
    maybeBlockhash: {
      type: 'blockhashArgs',
      args: {
        connections,
      },
    },
    instructions,
    additionalSigners,
    feePayer: bidderKey,
  });
};
