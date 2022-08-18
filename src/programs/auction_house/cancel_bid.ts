/*
Used for both:

delist
https://solscan.io/tx/3NNtERYmz8hWpFRZjiVPk7KBDpesLkmDxJSkNZNFUiAszyrTyUfy5HpySe3SQkBBWu6M8fZM3LpYVBTkLK9ma2P6
cancel + withdraw from fee + transfer

cancel bid
https://solscan.io/tx/5PCiWTkZqWHjcAoabsVzr8erM79uSwKMcJE671yiWYNFHd3aEeXr728dLZi7R2j7WJ3MzcQrSzESDEc6eHCLMfzL
cancel + withdraw from fee + transfer

the code basically checks if owner of token === wallet, if so it calls revoke, else simply closes trade state
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { getQuantityWithMantissa } from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createCancelInstruction,
  createWithdrawInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseTradeStatePda,
  toBigNumber,
} from '@metaplex-foundation/js';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';

export const makeAHCancelBidTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  walletOwner: string, //either nft owner (for delisting) or bidder (for bid cancellation)
  auctionHouse: string,
  priceLamports: BN,
  totalWithdrawLamports?: BN,
  cancelBid = false,
  tokenSize = 1,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const ownerKey = new PublicKey(walletOwner);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(connection, tokenSize, mintKey),
  );

  //this is supposed to be the account holding the NFT
  //this will work both in the case of cancel listings & cancel bid
  const largestTokenHolders = await connection.getTokenLargestAccounts(mintKey);
  const tokenAccountKey = largestTokenHolders.value[0].address;

  const tradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    ownerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(priceLamports),
    toBigNumber(tokenSizeAdjusted),
    tokenAccountKey,
  );

  const escrowPaymentAccount = await findAuctionHouseBuyerEscrowPda(
    auctionHouseKey,
    ownerKey,
  );

  const cancelIx = createCancelInstruction(
    {
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      authority: auctionHouseObj.authority,
      tokenAccount: tokenAccountKey,
      tokenMint: mintKey,
      tradeState,
      wallet: ownerKey,
    },
    { buyerPrice: priceLamports, tokenSize: tokenSizeAdjusted },
  );

  //only relevant for bids (withdrawing escrowed amount)
  if (cancelBid && totalWithdrawLamports) {
    const withdrawIx = createWithdrawInstruction(
      {
        auctionHouse: auctionHouseKey,
        auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
        authority: auctionHouseObj.authority,
        escrowPaymentAccount,
        receiptAccount: ownerKey,
        treasuryMint: auctionHouseObj.treasuryMint,
        wallet: ownerKey,
      },
      {
        amount: totalWithdrawLamports,
        escrowPaymentBump: escrowPaymentAccount.bump,
      },
    );

    instructions.push(withdrawIx);
  }

  instructions.push(cancelIx);

  return buildTx({
    connections,
    instructions,
    additionalSigners,
    feePayer: ownerKey,
  });
};
