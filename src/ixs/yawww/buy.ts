import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';
import { deserializeUnchecked, serialize } from 'borsh';
import {
  BuyListingInstructionData,
  LISTING_AUTH_PREFIX,
  MARKET_FEES_WALLET,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
  SaleListing,
  SUBSCRIPTION_PREFIX,
  SubscriptionType,
} from './state';

export const fetchListingAcc = async (
  connection: Connection,
  listingAccAddr: PublicKey,
): Promise<SaleListing> => {
  const data = await connection.getAccountInfo(listingAccAddr);
  if (!data) {
    throw new Error('listing acc missing');
  }

  return deserializeUnchecked(MARKET_SCHEMA, SaleListing, data.data);
};

// --------------------------------------- pdas

export const createListingAuthorityAccountPda = async (
  listingAccAddr: PublicKey,
  authorityBump: number,
): Promise<PublicKey> => {
  return await PublicKey.createProgramAddress(
    [
      Buffer.from(LISTING_AUTH_PREFIX),
      listingAccAddr.toBuffer(),
      new Uint8Array([authorityBump]),
    ],
    MARKET_PROGRAM_ID,
  );
};

export const findSubscriptionAccountPda = async (
  wallet: PublicKey,
): Promise<[PublicKey, number]> => {
  const subscriptionTypeBytes = new Uint8Array(1);
  subscriptionTypeBytes[0] = SubscriptionType.Standard;

  return await PublicKey.findProgramAddress(
    [
      Buffer.from(SUBSCRIPTION_PREFIX),
      wallet.toBuffer(),
      subscriptionTypeBytes,
    ],
    MARKET_PROGRAM_ID,
  );
};

// --------------------------------------- todo move to shared

export const getOrCreateAtaForMint = async ({
  connection,
  mint,
  owner,
}: {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
}): Promise<{
  tokenAccount: PublicKey;
  instructions: TransactionInstruction[];
}> => {
  const instructions: TransactionInstruction[] = [];

  const tokenAccount = await getAssociatedTokenAddress(mint, owner);

  const accInfo = await connection.getAccountInfo(tokenAccount);

  //create if missing
  if (!accInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(owner, tokenAccount, owner, mint),
    );
  }

  return {
    tokenAccount,
    instructions,
  };
};

// ---------------------------------------

export const makeYawwwBuyTx = async (
  connection: Connection,
  buyer: string,
  listing: string,
): Promise<Transaction> => {
  const listingAccAddr = new PublicKey(listing);
  const buyerAccount = new PublicKey(buyer);

  const tx = new Transaction({
    feePayer: buyerAccount,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  });

  const listingAcc = await fetchListingAcc(connection, listingAccAddr);

  const { tokenAccount: targetTokenAccount, instructions: tokenInstr } =
    await getOrCreateAtaForMint({
      connection,
      owner: buyerAccount,
      mint: listingAcc.item_mint,
    });

  const listingAuthorityAccount = await createListingAuthorityAccountPda(
    listingAccAddr,
    listingAcc.authority_bump,
  );

  const [subscriptionAccount] = await findSubscriptionAccountPda(
    listingAcc.owner,
  );

  const data = Buffer.from(
    serialize(
      MARKET_SCHEMA,
      new BuyListingInstructionData({
        price_expected: listingAcc.price,
      }),
    ),
  );

  const metaplex = new Metaplex(connection);
  const nft = await metaplex
    .nfts()
    .findByMint(new PublicKey(listingAcc.item_mint))
    .run();

  const instructionAccounts = [
    ///   0. `[signer]` Buyer's wallet account
    {
      pubkey: buyerAccount,
      isSigner: true,
      isWritable: true,
    },
    ///   1. `[writable]` Listing owner's wallet account
    {
      pubkey: listingAcc.owner,
      isSigner: false,
      isWritable: true,
    },
    ///   2. `[writable]` Listing account in open state
    {
      pubkey: listingAccAddr,
      isSigner: false,
      isWritable: true,
    },
    ///   3. `[writable]` PDA token account holding listed item [LISTING_ITEM_PREFIX, listing key]
    {
      pubkey: listingAcc.item_token_account,
      isSigner: false,
      isWritable: true,
    },
    ///   4. `[writable]` Buyer's token account where bought item will go to (preferably ATA)
    {
      pubkey: targetTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   5. `[writable]` Yawww fees wallet
    {
      pubkey: MARKET_FEES_WALLET,
      isSigner: false,
      isWritable: true,
    },

    ///   6. `[]` Listing owner subscription account where you can get discounts (pay with YAW or have staked NFTs) - still give if empty
    {
      pubkey: subscriptionAccount,
      isSigner: false,
      isWritable: false,
    },
    ///   7. `[]` Item mint
    {
      pubkey: listingAcc.item_mint,
      isSigner: false,
      isWritable: false,
    },
    ///   8. `[]` Item metadata
    {
      pubkey: nft.metadataAddress,
      isSigner: false,
      isWritable: false,
    },
    ///   9. `[]` Listing authority PDA [LISTING_AUTH_PREFIX, listing key]
    {
      pubkey: listingAuthorityAccount,
      isSigner: false,
      isWritable: false,
    },
    ///  10. `[]` Rent sysvar
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ///  11. `[]` ATA program
    {
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    ///  12. `[]` Token program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ///  13. `[]` System program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];

  ///
  ///  + `[writable]` Creator wallets (up to 5) - ONLY creators with share > 0 (no candy machine creators given)
  ///

  for (let i = 0; i < nft.creators.length; i++) {
    const creator = nft.creators[i];
    if (creator.share > 0) {
      instructionAccounts.push({
        pubkey: new PublicKey(creator.address),
        isSigner: false,
        isWritable: true,
      });
    }
  }

  ///  + `[writable]` optional wallet - ONLY if optional wallet was given in making the listing
  if (listingAcc.optional_wallet) {
    instructionAccounts.push({
      pubkey: listingAcc.optional_wallet,
      isSigner: false,
      isWritable: true,
    });
  }

  const transactionInstruction = new TransactionInstruction({
    programId: MARKET_PROGRAM_ID,
    keys: instructionAccounts,
    data,
  });

  if (tokenInstr.length) {
    tx.add(...tokenInstr);
  }
  tx.add(transactionInstruction);

  return tx;
};
