/*
accept bid
https://solscan.io/tx/3uie9LC6j9cVt2TABcwEqKoKLp2ue3RRKAtm4twFvV74D4BhqNeYiZwooAL6sLbSxsu2ptRp8YDfCY93taEpShpB
sell + transfer + withdraw from fee + transfer + transfer + ata create + execute sale
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getQuantityWithMantissa } from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createExecuteSaleInstruction,
  createSellInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
  toBigNumber,
} from '@metaplex-foundation/js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

export const makeAHAcceptBidTx = async (
  connection: Connection,
  tokenMint: string,
  seller: string,
  auctionHouse: string,
  buyer: string,
  newPriceLamports: BN, //bid to be accepted
  tokenSize = 1,
): Promise<{ tx: Transaction }> => {
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

  const programAsSigner = await findAuctionHouseProgramAsSignerPda();

  const sellerTradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(newPriceLamports),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey,
  );

  const buyerTradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    buyerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(newPriceLamports),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey, //yes should be seller's the one containing the nft
  );

  const freeTradeState = await findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(0),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey,
  );

  const escrowPaymentAccount = await findAuctionHouseBuyerEscrowPda(
    auctionHouseKey,
    buyerKey,
  );

  const metadata = await findMetadataPda(mintKey);

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
      freeTradeStateBump: freeTradeState.bump,
      programAsSignerBump: programAsSigner.bump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: sellerTradeState.bump,
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
      escrowPaymentBump: escrowPaymentAccount.bump,
      freeTradeStateBump: freeTradeState.bump,
      programAsSignerBump: programAsSigner.bump,
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

  const tx = new Transaction().add(sellIx);

  //optionally create ata for buyer
  const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccountKey);
  if (!buyerAtaInfo?.lamports || !buyerAtaInfo.data?.length) {
    tx.add(createAtaIx);
  }

  tx.add(execSaleIx);

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = sellerKey;

  return { tx };
};
