/*
buy
https://explorer.solana.com/tx/5na6GnUhy1hMX4Q9mRREJkkmwbpQRiApgnpMwnQQ6ku2hP4KCzWyG3qeJiXrodu9xLrkLyF9N4dVt8APur5cGDcd
deposit + buy + transfer + withdraw from fee + transfer + transfer + exec sale
 */

import {
  AuctionHouse,
  createBuyInstruction,
  createDepositInstruction,
  createExecuteSaleInstruction,
  PROGRAM_ID,
} from '@metaplex-foundation/mpl-auction-house';
import { fetchMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { getQuantityWithMantissa } from './shared';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';
import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
} from '../../metaplex';
import { defaultUmi } from 'src/utils';
import { publicKey, unwrapOption } from '@metaplex-foundation/umi';

export const makeAHBuyTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  auctionHouse: string,
  buyer: string,
  priceLamports: BN,
  tokenSize = 1,
  ahProgramId = PROGRAM_ID,
): Promise<
  TxWithHeight & {
    // Include these for later inspection if needed.
    auctionHouseObj: AuctionHouse;
    sellerTradeState: PublicKey;
  }
> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

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

  const [programAsSigner, programAsSignerBump] =
    findAuctionHouseProgramAsSignerPda(ahProgramId);

  const [sellerTradeState] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    priceLamports,
    tokenSizeAdjusted,
    sellerTokenAccountKey,
  );

  const [buyerTradeState, buyerTradeBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    buyerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    priceLamports,
    tokenSizeAdjusted,
    sellerTokenAccountKey, //yes should be seller's the one containing the nft
  );

  const [freeTradeState, freeTradeBump] = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    new BN(0),
    tokenSizeAdjusted,
    sellerTokenAccountKey,
    ahProgramId,
  );

  const [escrowPaymentAccount, escrowPaymentBump] =
    findAuctionHouseBuyerEscrowPda(auctionHouseKey, buyerKey, ahProgramId);
  const [metadata] = findMetadataPda(mintKey);

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
  const metadataDecoded = await fetchMetadata(
    defaultUmi,
    publicKey(metadata),
  );

  for (let i = 0; i < unwrapOption(metadataDecoded.creators)!.length; i++) {
    execSaleIx.keys.push({
      pubkey: new PublicKey(unwrapOption(metadataDecoded.creators)![i].address),
      isWritable: true,
      isSigner: false,
    });
  }

  instructions.push(depositIx, buyIx);

  if (auctionHouseObj.requiresSignOff) {
    execSaleIx.keys[9].isSigner = true;
  }

  //optionally create ata for buyer
  const buyerAtaInfo = await connection.getAccountInfo(buyerTokenAccountKey);
  if (!buyerAtaInfo?.lamports || !buyerAtaInfo.data?.length) {
    instructions.push(createAtaIx);
  }

  instructions.push(execSaleIx);

  return {
    ...(await buildTx({
      maybeBlockhash: {
        type: 'blockhashArgs',
        args: {
          connections,
        },
      },
      instructions,
      additionalSigners,
      feePayer: buyerKey,
    })),
    auctionHouseObj,
    sellerTradeState,
  };
};
