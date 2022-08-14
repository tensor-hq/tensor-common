import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  findListingAuthAccountPda,
  findListingTokenAccountPda,
} from './shared';
import {
  InitListingInstructionData,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
  MAX_ITEM_LISTING_ACCOUNT_SIZE,
} from './state';
import BN from 'bn.js';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';

export const makeYawwwListTx = async (
  connections: Array<Connection>,
  tokenMint: string,
  seller: string,
  priceLamports: BN,
  creatorShare?: number,
  optionalShare?: number,
  optionalFeeReceiver?: string,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

  const sellerAccount = new PublicKey(seller);
  const optionalFeeReceiverAccount = optionalFeeReceiver
    ? new PublicKey(optionalFeeReceiver)
    : undefined;
  const mintAccount = new PublicKey(tokenMint);

  const listingAcc = new Keypair();

  const listingAccountRentExempt =
    await connection.getMinimumBalanceForRentExemption(
      MAX_ITEM_LISTING_ACCOUNT_SIZE,
    );

  const createListingAccountInstruction = SystemProgram.createAccount({
    space: MAX_ITEM_LISTING_ACCOUNT_SIZE,
    lamports: listingAccountRentExempt,
    fromPubkey: sellerAccount,
    newAccountPubkey: listingAcc.publicKey,
    programId: MARKET_PROGRAM_ID,
  });
  instructions.push(createListingAccountInstruction);

  // Uninitialized PDA escrow token account to hold listed item
  const [listingTokenAccount, listingTokenAccountBump] =
    await findListingTokenAccountPda(listingAcc.publicKey);

  const [listingAuthorityAccount, listingAuthorityBump] =
    await findListingAuthAccountPda(listingAcc.publicKey);

  const data = Buffer.from(
    serialize(
      MARKET_SCHEMA,
      new InitListingInstructionData({
        amount: new BN(1),
        price: priceLamports,
        creator_share: creatorShare ?? 0,
        optional_wallet: optionalFeeReceiverAccount,
        optional_share: optionalShare ?? 0,
        authority_bump: listingAuthorityBump,
        escrow_token_account_bump: listingTokenAccountBump,
      }),
    ),
  );

  const tokenAccount = await getAssociatedTokenAddress(
    mintAccount,
    sellerAccount,
  );

  const instructionAccounts = [
    ///   0. `[signer]` Initializer's wallet account
    {
      pubkey: sellerAccount,
      isSigner: true,
      isWritable: true,
    },
    ///   1. `[writable]` Uninitialized listing account - will be filled in here
    {
      pubkey: listingAcc.publicKey,
      isSigner: false,
      isWritable: true,
    },
    ///   2. `[writable]` Uninitialized PDA escrow token account to hold listed item [LISTNG_ITEM_PREFIX, listing key]
    {
      pubkey: listingTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   3. `[writable]` Initializer's token account where item will come from
    {
      pubkey: tokenAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   4. `[writable]` Mint account of the item, needed for token account creation
    {
      pubkey: mintAccount,
      isSigner: false,
      isWritable: true,
    },
    ///   5. `[]` Listing authority PDA [LISTNG_AUTH_PREFIX, listing key]
    {
      pubkey: listingAuthorityAccount,
      isSigner: false,
      isWritable: false,
    },
    ///   6. `[]` Token program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ///   7. `[]` System program
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

  instructions.push(transactionInstruction);
  additionalSigners.push(listingAcc);

  return buildTx({
    connections,
    instructions,
    additionalSigners,
    feePayer: sellerAccount,
  });
};
