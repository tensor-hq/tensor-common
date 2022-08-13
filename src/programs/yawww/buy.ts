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
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';
import { serialize } from 'borsh';
import {
  BuyListingInstructionData,
  MARKET_FEES_WALLET,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
} from './state';
import {
  createListingAuthorityAccountPda,
  fetchYawwwListingAcc,
  findSubscriptionAccountPda,
} from './shared';
import { getOrCreateAtaForMint } from '../../solana_contrib';

export const makeYawwwBuyTx = async (
  connection: Connection,
  buyer: string,
  listing: string,
): Promise<{ tx: Transaction }> => {
  const listingAccAddr = new PublicKey(listing);
  const buyerAccount = new PublicKey(buyer);

  const tx = new Transaction({
    feePayer: buyerAccount,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  });

  const listingAcc = await fetchYawwwListingAcc(connection, listingAccAddr);

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

  return { tx };
};
