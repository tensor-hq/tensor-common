/*
accept bid
https://solscan.io/tx/3uie9LC6j9cVt2TABcwEqKoKLp2ue3RRKAtm4twFvV74D4BhqNeYiZwooAL6sLbSxsu2ptRp8YDfCY93taEpShpB
sell + transfer + withdraw from fee + transfer + transfer + ata create + execute sale
 */

import {
  AuctionHouse,
  createExecuteSaleInstruction,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
} from '../../metaplex';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';
import { getQuantityWithMantissa } from './shared';

export const makeAHAcceptBidTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  seller: string,
  auctionHouse: string,
  buyer: string,
  newPriceLamports: BN, //bid to be accepted
  tokenSize = 1,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const sellerKey = new PublicKey(seller);
  const buyerKey = new PublicKey(buyer);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(connection, tokenSize, mintKey),
  );

  const sellerTokenAccountKey = await getAssociatedTokenAddress(
    mintKey,
    sellerKey,
  );
  const buyerTokenAccountKey = await getAssociatedTokenAddress(
    mintKey,
    buyerKey,
  );

  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSignerPda();

  const [sellerTradeState, sellerTradeStateBump] =
    findAuctionHouseTradeStatePda(
      auctionHouseKey,
      sellerKey,
      auctionHouseObj.treasuryMint,
      mintKey,
      newPriceLamports,
      tokenSizeAdjusted,
      sellerTokenAccountKey,
    );

  const [buyerTradeState, buyerTradeStateBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    buyerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    newPriceLamports,
    tokenSizeAdjusted,
    sellerTokenAccountKey, //yes should be seller's the one containing the nft
  );

  const [freeTradeState, freeTradeStateBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    new BN(0),
    tokenSizeAdjusted,
    sellerTokenAccountKey,
  );

  const [escrowPaymentAccount, escrowPaymentAccountBump] =
    findAuctionHouseBuyerEscrowPda(auctionHouseKey, buyerKey);

  const [metadata] = findMetadataPda(mintKey);

  const sellIx = createSellInstruction(
    {
      wallet: sellerKey,
      authority: auctionHouseObj.authority,
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      freeSellerTradeState: freeTradeState,
      metadata,
      programAsSigner,
      sellerTradeState,
      tokenAccount: sellerTokenAccountKey,
    },
    {
      buyerPrice: newPriceLamports,
      freeTradeStateBump: freeTradeStateBump,
      programAsSignerBump: programAsSignerBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: sellerTradeStateBump,
    },
  );

  const createAtaIx = createAssociatedTokenAccountInstruction(
    sellerKey,
    buyerTokenAccountKey,
    buyerKey,
    mintKey,
  );

  const execSaleIx = createExecuteSaleInstruction(
    {
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      auctionHouseTreasury: auctionHouseObj.auctionHouseTreasury,
      authority: auctionHouseObj.authority,
      buyer: buyerKey,
      buyerReceiptTokenAccount: buyerTokenAccountKey,
      buyerTradeState,
      escrowPaymentAccount,
      freeTradeState,
      metadata,
      programAsSigner,
      seller: sellerKey,
      sellerPaymentReceiptAccount: sellerKey,
      sellerTradeState,
      tokenAccount: sellerTokenAccountKey,
      tokenMint: mintKey,
      treasuryMint: auctionHouseObj.treasuryMint,
    },
    {
      buyerPrice: newPriceLamports,
      escrowPaymentBump: escrowPaymentAccountBump,
      freeTradeStateBump: freeTradeStateBump,
      programAsSignerBump: programAsSignerBump,
      tokenSize: tokenSizeAdjusted,
    },
  );

  //add creators for royalty payments
  const metadataDecoded = await Metadata.fromAccountAddress(
    connection,
    metadata,
  );

  for (let i = 0; i < metadataDecoded.data.creators!.length; i++) {
    execSaleIx.keys.push({
      pubkey: new PublicKey(metadataDecoded.data.creators![i].address),
      isWritable: true,
      isSigner: false,
    });
  }

  instructions.push(sellIx);

  //optionally create ata for buyer
  const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccountKey);
  if (!buyerAtaInfo?.lamports || !buyerAtaInfo.data?.length) {
    instructions.push(createAtaIx);
  }

  instructions.push(execSaleIx);

  return buildTx({
    maybeBlockhash: {
      type: 'blockhashArgs',
      args: {
        connections,
      },
    },
    instructions,
    additionalSigners,
    feePayer: sellerKey,
  });
};
