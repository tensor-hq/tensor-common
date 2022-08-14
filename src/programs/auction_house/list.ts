/*
list
https://solscan.io/tx/4Cb7HJNiu2csheApMfjx21A2WPHqQF3Qx2aDEvkYoz8W9HGWkbeENhxUD1uavhNpm8nCtuFZbhEsKxqJARzzWYVc
sell + transfer
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
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import {
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
  toBigNumber,
} from '@metaplex-foundation/js';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';

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

  instructions.push(sellIx);

  return buildTx({
    connections,
    instructions,
    additionalSigners,
    feePayer: ownerKey,
  });
};
