import {
  findAuctionHouseBuyerEscrowPda,
  findAuctionHouseProgramAsSignerPda,
  findAuctionHouseTradeStatePda,
  findMetadataPda,
  toBigNumber,
} from "@metaplex-foundation/js";
import {
  AuctionHouse,
  createExecuteSaleInstruction,
  createDepositInstruction,
  createBuyInstruction,
  PROGRAM_ID,
} from "@metaplex-foundation/mpl-auction-house";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getQuantityWithMantissa } from "../shared";

export const makeAHBuyTx = async (
  conn: Connection,
  tokenMint: string,
  auctionHouse: string,
  buyer: string,
  // TODO: support other currencies.
  priceLamports: BN, //original ask
  tokenSize = 1,
  ahProgramId = PROGRAM_ID
): Promise<Transaction> => {
  const auctionHouseKey = new PublicKey(auctionHouse);
  const mintKey = new PublicKey(tokenMint);
  const buyerKey = new PublicKey(buyer);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    conn,
    auctionHouseKey
  );

  const buyPriceAdjusted = priceLamports;
  const tokenSizeAdjusted = new BN(
    await getQuantityWithMantissa(conn, tokenSize, mintKey)
  );

  const buyerTokenAccountKey = await getAssociatedTokenAddress(
    mintKey,
    buyerKey
  );

  //this is supposed to be the account holding the NFT
  const largestTokenHolders = await conn.getTokenLargestAccounts(mintKey);
  const sellerTokenAccountKey = largestTokenHolders.value[0].address;
  const sellerTokenAcc = await getAccount(conn, sellerTokenAccountKey);
  const sellerKey = new PublicKey(sellerTokenAcc.owner);

  const programAsSigner = findAuctionHouseProgramAsSignerPda(ahProgramId);
  const programAsSignerBump = programAsSigner.bump;

  const sellerTradeState = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    sellerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(buyPriceAdjusted),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey,
    ahProgramId
  );

  const buyerTradeState = findAuctionHouseTradeStatePda(
    auctionHouseKey,
    buyerKey,
    auctionHouseObj.treasuryMint,
    mintKey,
    toBigNumber(buyPriceAdjusted),
    toBigNumber(tokenSizeAdjusted),
    sellerTokenAccountKey, //yes should be seller's the one containing the nft
    ahProgramId
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
    ahProgramId
  );
  const freeTradeBump = freeTradeState.bump;

  const escrowPaymentAccount = findAuctionHouseBuyerEscrowPda(
    auctionHouseKey,
    buyerKey,
    ahProgramId
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
      amount: buyPriceAdjusted,
      escrowPaymentBump,
    }
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
      buyerPrice: buyPriceAdjusted,
      escrowPaymentBump,
      tokenSize: tokenSizeAdjusted,
      tradeStateBump: buyerTradeBump,
    }
  );

  const createAtaIx = createAssociatedTokenAccountInstruction(
    buyerKey,
    buyerTokenAccountKey,
    buyerKey,
    mintKey
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
      buyerPrice: buyPriceAdjusted,
      escrowPaymentBump,
      freeTradeStateBump: freeTradeBump,
      programAsSignerBump,
      tokenSize: tokenSizeAdjusted,
    }
  );

  //add creators for royalty payments

  const metadataDecoded = await Metadata.fromAccountAddress(conn, metadata);

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
  const buyerAtaInfo = await conn.getAccountInfo(buyerTokenAccountKey);
  if (!buyerAtaInfo?.lamports || !buyerAtaInfo.data?.length) {
    tx.add(createAtaIx);
  }

  tx.add(execSaleIx);

  tx.recentBlockhash = (await conn.getLatestBlockhash()).blockhash;
  tx.feePayer = buyerKey;

  return tx;
};
