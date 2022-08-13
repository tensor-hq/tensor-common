/*
list
https://solscan.io/tx/4Cb7HJNiu2csheApMfjx21A2WPHqQF3Qx2aDEvkYoz8W9HGWkbeENhxUD1uavhNpm8nCtuFZbhEsKxqJARzzWYVc
sell + transfer
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getQuantityWithMantissa } from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
  toBigNumber,
} from '@metaplex-foundation/js';

export const makeAHListTx = async (
  connection: Connection,
  tokenMint: string,
  tokenOwner: string,
  auctionHouse: string,
  priceLamports: BN,
  tokenSize = 1,
): Promise<{ tx: Transaction }> => {
  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const ownerKey = new PublicKey(tokenOwner);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(connection, tokenSize, mintKey),
  );

  const tokenAccountKey = await getAssociatedTokenAddress(mintKey, ownerKey);

  const programAsSigner = await findAuctionHouseProgramAsSignerPda();

  const tradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    ownerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(priceLamports),
    toBigNumber(tokenSizeAdjusted),
    tokenAccountKey,
  );

  const freeTradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    ownerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(0),
    toBigNumber(tokenSizeAdjusted),
    tokenAccountKey,
  );

  const sellIx = createSellInstruction(
    {
      wallet: ownerKey,
      authority: auctionHouseObj.authority,
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      freeSellerTradeState: freeTradeState,
      metadata: await findMetadataPda(mintKey),
      programAsSigner,
      sellerTradeState: tradeState,
      tokenAccount: tokenAccountKey,
    },
    {
      buyerPrice: priceLamports,
      freeTradeStateBump: freeTradeState.bump,
      programAsSignerBump: programAsSigner.bump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: tradeState.bump,
    },
  );

  const tx = new Transaction().add(sellIx);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = ownerKey;

  return { tx };
};
