import {
  Connection,
  Keypair,
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
  createListingAuthorityAccountPda,
  findListingAuthAccountPda,
  findListingTokenAccountPda,
} from './shared';
import {
  InstructionData,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
  MarketInstructionNumber,
} from './state';
import { buildTx, getOrCreateAtaForMint } from '../../solana_contrib';

export const makeYawwwDelistTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  seller: string,
  listing: string,
): Promise<{ tx: Transaction }> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

  const sellerAccount = new PublicKey(seller);
  const mintAccount = new PublicKey(tokenMint);
  const listingAccAddr = new PublicKey(listing);

  const { tokenAccount: targetTokenAccount, instructions: tokenInstr } =
    await getOrCreateAtaForMint({
      connection,
      owner: sellerAccount,
      mint: mintAccount,
    });

  const [_, listingAughBump] = await findListingAuthAccountPda(listingAccAddr);
  const listingAuthorityAccount = await createListingAuthorityAccountPda(
    listingAccAddr,
    listingAughBump,
  );
  const [listingTokenAccount] = await findListingTokenAccountPda(
    listingAccAddr,
  );

  const data = Buffer.from(
    serialize(
      MARKET_SCHEMA,
      new InstructionData({
        instruction: MarketInstructionNumber.CancelListing,
      }),
    ),
  );

  const instructionAccounts = [
    ///   0. `[signer]` Initializer's wallet account
    {
      pubkey: sellerAccount,
      isSigner: true,
      isWritable: true,
    },
    ///   1. `[writable]` Listing account in open state
    {
      pubkey: listingAccAddr,
      isSigner: false,
      isWritable: true,
    },
    ///   2. `[writable]` PDA token account holding listed item [LISTING_ITEM_PREFIX, listing key]
    {
      pubkey: listingTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   3. `[writable]` Initializer's token account where item will go back to (preferably ATA)
    {
      pubkey: targetTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   4. `[]` Mint account of the item, needed for token account creation
    {
      pubkey: mintAccount,
      isSigner: false,
      isWritable: false,
    },
    ///   5. `[]` Listing authority PDA [LISTNG_AUTH_PREFIX, listing key]
    {
      pubkey: listingAuthorityAccount,
      isSigner: false,
      isWritable: false,
    },
    ///   6. `[]` Rent sysvar
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ///   7. `[]` ATA program
    {
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    ///   8. `[]` Token program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ///   9. `[]` System program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];

  const transactionInstruction = new TransactionInstruction({
    programId: MARKET_PROGRAM_ID,
    keys: instructionAccounts,
    data,
  });

  if (tokenInstr.length) {
    instructions.push(...tokenInstr);
  }
  instructions.push(transactionInstruction);

  return {
    tx: await buildTx({
      connections,
      instructions,
      additionalSigners,
      feePayer: sellerAccount,
    }),
  };
};
