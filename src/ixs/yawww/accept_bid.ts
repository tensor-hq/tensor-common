import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  fetchBidAcc,
  findListingAuthAccountPda,
  findSubscriptionAccountPda,
} from './shared';
import {
  InstructionData,
  MARKET_FEES_WALLET,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
  MarketInstructionNumber,
} from './state';
import { Metaplex } from '@metaplex-foundation/js';
import { getOrCreateAtaForMint } from '../shared';

const makeYawwwAcceptBidTx = async (
  connection: Connection,
  seller: string,
  bid: string,
): Promise<{ tx: Transaction }> => {
  const bidAccountAddr = new PublicKey(bid);
  const bidAcc = await fetchBidAcc(connection, bidAccountAddr);
  const ownerAccount = new PublicKey(seller);

  const tx = new Transaction({
    feePayer: ownerAccount,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  });

  const { tokenAccount: buyerTokenAccount, instructions: tokenInstr } =
    await getOrCreateAtaForMint({
      connection,
      owner: bidAcc.bidder,
      mint: bidAcc.listingAcc.item_mint,
    });

  const [subscriptionAccount] = await findSubscriptionAccountPda(
    bidAcc.listingAcc.owner,
  );
  const [listingAuthorityAccount] = await findListingAuthAccountPda(
    bidAcc.listing,
  );

  const data = Buffer.from(
    serialize(
      MARKET_SCHEMA,
      new InstructionData({
        instruction: MarketInstructionNumber.AcceptBid,
      }),
    ),
  );

  const metaplex = new Metaplex(connection);
  const nft = await metaplex
    .nfts()
    .findByMint(new PublicKey(bidAcc.listingAcc.item_mint))
    .run();

  const instructionAccounts = [
    ///   0. `[signer]` Listing owner's wallet account
    {
      pubkey: ownerAccount,
      isSigner: true,
      isWritable: true,
    },
    ///   1. `[writable]` Bidder's wallet account
    {
      pubkey: bidAcc.bidder,
      isSigner: false,
      isWritable: true,
    },
    ///   2. `[writable]` Listing account in open state
    {
      pubkey: bidAcc.listing,
      isSigner: false,
      isWritable: true,
    },
    ///   3. `[writable]` Listing bid account in open state
    {
      pubkey: bidAccountAddr,
      isSigner: false,
      isWritable: true,
    },
    ///   4. `[writable]` PDA token account holding listed item [LISTING_ITEM_PREFIX, listing key]
    {
      pubkey: bidAcc.listingAcc.item_token_account,
      isSigner: false,
      isWritable: true,
    },
    ///   5. `[writable]` Bidder's token account where bought item will go to (preferably ATA)
    {
      pubkey: buyerTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   6. `[writable]` Yawww fees wallet
    {
      pubkey: MARKET_FEES_WALLET,
      isSigner: false,
      isWritable: true,
    },
    ///   7. `[]` Listing owner's subscription account where you can get discounts - still give if empty
    {
      pubkey: subscriptionAccount,
      isSigner: false,
      isWritable: false,
    },
    ///   8. `[]` Item mint
    {
      pubkey: bidAcc.listingAcc.item_mint,
      isSigner: false,
      isWritable: false,
    },
    ///   9. `[]` Item metadata
    {
      pubkey: nft.metadataAddress,
      isSigner: false,
      isWritable: false,
    },
    ///  10. `[]` Listing authority PDA [LISTING_AUTH_PREFIX, listing key]
    {
      pubkey: listingAuthorityAccount,
      isSigner: false,
      isWritable: false,
    },
    ///  11. `[]` Rent sysvar
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ///  12. `[]` ATA program
    {
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    ///  13. `[]` Token program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ///  14. `[]` System program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];

  ///
  ///  CREATORS ALWAYS FROM CHAIN, NOT JSON metadata. ALSO ORDER NEEDS TO BE SAME
  ///  + `[writable]` Creator wallets (up to 5) - ONLY creators with share > 0 (no candy machine creators given)

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

  ///
  ///  + `[writable]` optional wallet - ONLY if optional wallet was given in making the listing

  if (bidAcc.listingAcc.optional_wallet) {
    instructionAccounts.push({
      pubkey: bidAcc.listingAcc.optional_wallet,
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
