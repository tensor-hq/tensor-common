/*
buy
https://explorer.solana.com/tx/5na6GnUhy1hMX4Q9mRREJkkmwbpQRiApgnpMwnQQ6ku2hP4KCzWyG3qeJiXrodu9xLrkLyF9N4dVt8APur5cGDcd
deposit + buy + transfer + withdraw from fee + transfer + transfer + exec sale
 */

import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
  Pda,
  toBigNumber,
} from '@metaplex-foundation/js';
import {
  AuctionHouse,
  createExecuteSaleInstruction,
  createDepositInstruction,
  createBuyInstruction,
  PROGRAM_ID,
} from '@metaplex-foundation/mpl-auction-house';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { getQuantityWithMantissa } from './shared';

export const makeAHBuyTx = async (
  connection: Connection,
  tokenMint: string,
  auctionHouse: string,
  buyer: string,
  priceLamports: BN,
  tokenSize = 1,
  ahProgramId = PROGRAM_ID,
): Promise<{
  tx: Transaction;
  // Include these for later inspection if needed.
  auctionHouseObj: AuctionHouse;
  sellerTradeState: Pda;
}> => {
  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const buyerKey = new PublicKey(buyer);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const tokenSizeAdjusted = await getQuantityWithMantissa(
    connection,
    tokenSize,
    mintKey,
  );

  const buyerTokenAccountKey = await getAssociatedTokenAddress(
    mintKey,
    buyerKey,
  );

  //this is supposed to be the account holding the NFT
  const largestTokenHolders = await connection.getTokenLargestAccounts(mintKey);
  const sellerTokenAccountKey = largestTokenHolders.value[0].address;
  const sellerTokenAcc = await getAccount(connection, sellerTokenAccountKey);
  const sellerKey = new PublicKey(sellerTokenAcc.owner);

  const programAsSigner = findAuctionHouseProgramAsSignerPda(ahProgramId);
  const programAsSignerBump = programAsSigner.bump;

  const sellerTradeState = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(priceLamports),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey,
  );

  const buyerTradeState = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    buyerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(priceLamports),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey, //yes should be seller's the one containing the nft
  );
  const buyerTradeBump = buyerTradeState.bump;

  const freeTradeState = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(0),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey,
    ahProgramId,
  );
  const freeTradeBump = freeTradeState.bump;

  const escrowPaymentAccount = findAuctionHouseBuyerEscrowPda(
    auctionHouseKey,
    buyerKey,
    ahProgramId,
  );
  const escrowPaymentBump = escrowPaymentAccount.bump;

  const metadata = findMetadataPda(mintKey);

  const depositIx = createDepositInstruction(
    {
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      authority: auctionHouseObj.authority,
      escrowPaymentAccount,
      paymentAccount: buyerKey,
      transferAuthority: auctionHouseObj.authority, //as per OpenSea
      treasuryMint: auctionHouseObj.treasuryMint,
      wallet: buyerKey,
    },
    {
      amount: priceLamports,
      escrowPaymentBump,
    },
  );

  const buyIx = createBuyInstruction(
    {
      auctionHouse: auctionHouseKey,
      auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
      authority: auctionHouseObj.authority,
      buyerTradeState,
      escrowPaymentAccount,
      metadata,
      paymentAccount: buyerKey,
      tokenAccount: sellerTokenAccountKey,
      transferAuthority: SystemProgram.programId, //as per OpenSea
      treasuryMint: auctionHouseObj.treasuryMint,
      wallet: buyerKey,
    },
    {
      buyerPrice: priceLamports,
      escrowPaymentBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: buyerTradeBump,
    },
  );

  const createAtaIx = createAssociatedTokenAccountInstruction(
    buyerKey,
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
      buyerPrice: priceLamports,
      escrowPaymentBump,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump,
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

  const tx = new Transaction().add(depositIx, buyIx);

  if (auctionHouseObj.requiresSignOff) {
    execSaleIx.keys[9].isSigner = true;
  }

  //optionally create ata for buyer
  const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccountKey);
  if (!buyerAtaInfo?.lamports || !buyerAtaInfo.data?.length) {
    tx.add(createAtaIx);
  }

  tx.add(execSaleIx);

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = buyerKey;

  return { tx, auctionHouseObj, sellerTradeState };
};
