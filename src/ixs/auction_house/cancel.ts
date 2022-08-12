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
  LAMPORTS_PER_SOL,
  PublicKey,
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
  createCancelInstruction,
  createWithdrawInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';

const makeAHCancelBidTx = async (
  connection: Connection,
  tokenMint: string,
  walletOwner: string, //either nft owner (for delisting) or bidder (for bid cancellation)
  auctionHouse: string,
  priceLamports: BN,
  totalWithdrawLamports?: BN,
  cancelBid = false,
  tokenSize = 1,
): Promise<{ tx: Transaction }> => {
  const price = priceLamports.div(new BN(LAMPORTS_PER_SOL)).toNumber();
  const totalWithdraw = totalWithdrawLamports
    ?.div(new BN(LAMPORTS_PER_SOL))
    .toNumber();

  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const ownerKey = new PublicKey(walletOwner);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const buyPriceAdjusted = new BN(
    await getQuantityWithMantissa(
      connection,
      price,
      //@ts-ignore
      auctionHouseObj.treasuryMint,
    ),
  );

  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(connection, tokenSize, mintKey),
  );

  const totalWithdrawAdjusted = totalWithdraw
    ? new BN(
        await getQuantityWithMantissa(
          connection,
          totalWithdraw,
          auctionHouseObj.treasuryMint,
        ),
      )
    : undefined;

  //this is supposed to be the account holding the NFT
  //this will work both in the case of cancel listings & cancel bid
  const largestTokenHolders = await connection.getTokenLargestAccounts(mintKey);
  const tokenAccountKey = largestTokenHolders.value[0].address;

  const [tradeState, tradeStateBump] = await getAuctionHouseTradeState(
    auctionHouseKey,
    ownerKey,
    tokenAccountKey,
    //@ts-ignore
    auctionHouseObj.treasuryMint,
    mintKey,
    tokenSizeAdjusted,
    buyPriceAdjusted,
  );

  const [escrowPaymentAccount, escrowPaymentBump] =
    await getAuctionHouseBuyerEscrow(auctionHouseKey, ownerKey);

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
    { buyerPrice: buyPriceAdjusted, tokenSize: tokenSizeAdjusted },
  );

  const tx = new Transaction();

  //only relevant for bids (withdrawing escrowed amount)
  if (cancelBid && totalWithdrawAdjusted) {
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
        amount: totalWithdrawAdjusted,
        escrowPaymentBump,
      },
    );

    tx.add(withdrawIx);
  }

  tx.add(cancelIx);

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = ownerKey;

  return { tx };
};
