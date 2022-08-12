/*
list
https://solscan.io/tx/4Cb7HJNiu2csheApMfjx21A2WPHqQF3Qx2aDEvkYoz8W9HGWkbeENhxUD1uavhNpm8nCtuFZbhEsKxqJARzzWYVc
sell + transfer
 */

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import {
  getAuctionHouseProgramAsSigner,
  getAuctionHouseTradeState,
  getQuantityWithMantissa,
} from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { findMetadataPda } from '@metaplex-foundation/js';

export const makeAHListTx = async (
  connection: Connection,
  tokenMint: string,
  tokenOwner: string,
  auctionHouse: string,
  priceLamports: BN,
  tokenSize = 1,
): Promise<{ tx: Transaction }> => {
  const price = priceLamports.div(new BN(LAMPORTS_PER_SOL)).toNumber();

  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const ownerKey = new PublicKey(tokenOwner);

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

  const tokenAccountKey = await getAssociatedTokenAddress(mintKey, ownerKey);

  const [programAsSigner, programAsSignerBump] =
    await getAuctionHouseProgramAsSigner();

  const [tradeState, tradeBump] = await getAuctionHouseTradeState(
    auctionHouseKey,
    ownerKey,
    tokenAccountKey,
    //@ts-ignore
    auctionHouseObj.treasuryMint,
    mintKey,
    tokenSizeAdjusted,
    buyPriceAdjusted,
  );

  const [freeTradeState, freeTradeBump] = await getAuctionHouseTradeState(
    auctionHouseKey,
    ownerKey,
    tokenAccountKey,
    //@ts-ignore
    auctionHouseObj.treasuryMint,
    mintKey,
    tokenSizeAdjusted,
    new BN(0),
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
      buyerPrice: buyPriceAdjusted,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: tradeBump,
    },
  );

  const tx = new Transaction().add(sellIx);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = ownerKey;

  return { tx };
};
