import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { findYawwwBidAcc } from './shared';
import {
  BidOnListingInstructionData,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
} from './state';
import BN from 'bn.js';

export const makeYawwwBidTx = async (
  connection: Connection,
  buyer: string,
  listing: string,
  priceLamports: BN,
): Promise<{ tx: Transaction }> => {
  const listingAccAddr = new PublicKey(listing);
  const buyerAccount = new PublicKey(buyer);

  const tx = new Transaction({
    feePayer: buyerAccount,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  });

  const { bidAccAddr, bidAccBump, bidId } = await findYawwwBidAcc(
    connection,
    'new',
    listingAccAddr,
    buyerAccount,
  );

  const instructionAccounts = [
    ///   0. `[signer]` Bidder's wallet account
    {
      pubkey: buyerAccount,
      isSigner: true,
      isWritable: true,
    },
    ///   1. `[writable]` Uninitialized bid PDA - will be filled in here [BID_PREFIX, listing key, bidder key, bid id]
    {
      pubkey: bidAccAddr,
      isSigner: false,
      isWritable: true,
    },
    ///   2. `[]` Listing account in open state
    {
      pubkey: listingAccAddr,
      isSigner: false,
      isWritable: false,
    },
    ///   3. `[]` Token program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ///   4. `[]` System program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];

  /// Optional - if listing for non-Sol payment
  let bidCurrencyTokenAccountBump = undefined;
  // if (currencyMint) {
  //   const currencyTokenAccount = await getTokenAccount({
  //     connection,
  //     owner: buyerWallet,
  //     mint: currencyMint,
  //     minBalance: price,
  //   })
  //
  //   if (isNil(currencyTokenAccount)) {
  //     throw Error('Currency token account not found!')
  //   }
  //
  //
  //   // BID_PRICE_PREFIX, bid key
  //   const bidCurrencyTokenAccountProgramAddress =
  //     await PublicKey.findProgramAddress(
  //       [Buffer.from(BID_PRICE_PREFIX), bidAccount.toBuffer()],
  //       MARKET_PROGRAM_ID
  //     )
  //
  //   const bidCurrencyTokenAccount = bidCurrencyTokenAccountProgramAddress[0]
  //   bidCurrencyTokenAccountBump = bidCurrencyTokenAccountProgramAddress[1]
  //
  //   instructionAccounts.push(
  //     ...[
  //       ///   5. `[writable]` Bidder's token account where bid tokens come from
  //       {
  //         pubkey: currencyTokenAccount,
  //         isSigner: false,
  //         isWritable: true,
  //       },
  //       ///   6. `[writable]` Uninitialized PDA token account holding bid tokens [BID_PRICE_PREFIX, bid key]
  //       {
  //         pubkey: bidCurrencyTokenAccount,
  //         isSigner: false,
  //         isWritable: true,
  //       },
  //       ///   7. `[]` Price mint account
  //       {
  //         pubkey: currencyMint,
  //         isSigner: false,
  //         isWritable: false,
  //       },
  //     ]
  //   )
  // }

  const data = Buffer.from(
    serialize(
      MARKET_SCHEMA,
      new BidOnListingInstructionData({
        price: priceLamports,
        bid_bump: bidAccBump,
        bid_escrow_bump: bidCurrencyTokenAccountBump ?? 0,
        bid_id: bidId,
      }),
    ),
  );

  const transactionInstruction = new TransactionInstruction({
    programId: MARKET_PROGRAM_ID,
    keys: instructionAccounts,
    data,
  });

  tx.add(transactionInstruction);

  return { tx };
};
