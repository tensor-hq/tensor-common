/*
list
https://solscan.io/tx/4Cb7HJNiu2csheApMfjx21A2WPHqQF3Qx2aDEvkYoz8W9HGWkbeENhxUD1uavhNpm8nCtuFZbhEsKxqJARzzWYVc
sell + transfer
 */

import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import { getQuantityWithMantissa } from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';
import {
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
} from '../../metaplex';

export const makeAHListTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  tokenOwner: string,
  auctionHouse: string,
  priceLamports: BN,
  tokenSize = 1,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

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

  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSignerPda();

  const [tradeState, tradeStateBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    ownerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    priceLamports,
    tokenSizeAdjusted,
    tokenAccountKey,
  );

  const [freeTradeState, freeTradeStateBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    ownerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    new BN(0),
    tokenSizeAdjusted,
    tokenAccountKey,
  );

  const sellIx = createSellInstruction(
    {
      wallet: ownerKey,
      authority: auctionHouseObj.authority,
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      freeSellerTradeState: freeTradeState,
      metadata: findMetadataPda(mintKey)[0],
      programAsSigner,
      sellerTradeState: tradeState,
      tokenAccount: tokenAccountKey,
    },
    {
      buyerPrice: priceLamports,
      freeTradeStateBump,
      programAsSignerBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump,
    },
  );

  instructions.push(sellIx);

  return buildTx({
    connections,
    instructions,
    additionalSigners,
    feePayer: ownerKey,
  });
};
