import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  InstructionData,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
  MarketInstructionNumber,
} from './state';

export const makeYawwwCancelBidTx = async (
  connection: Connection,
  buyer: string,
  bid: string,
): Promise<{ tx: Transaction }> => {
  const buyerAccount = new PublicKey(buyer);
  const bidAccAddr = new PublicKey(bid);

  const tx = new Transaction({
    feePayer: buyerAccount,
    recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  });

  // (!) whis would be used to fetch / cancel the "next" bid, but we pass it in directly instead
  // const listing = await fetchListingAcc(saleListingAccount);
  // if (!listing) {
  //   throw new Error(
  //     `listing at address ${saleListingAccount.toBase58()} not found`,
  //   );
  // }
  // const { bidAccAddress } = await findBidAcc(
  //   'latest',
  //   saleListingAccount,
  //   buyerAccount,
  // );

  const data = Buffer.from(
    serialize(
      MARKET_SCHEMA,
      new InstructionData({
        instruction: MarketInstructionNumber.CancelBid,
      }),
    ),
  );

  const instructionAccounts = [
    ///   0. `[signer]` Bidder's wallet account
    {
      pubkey: buyerAccount,
      isSigner: true,
      isWritable: true,
    },
    ///   1. `[writable]` Bid PDA [BID_PREFIX, listing key, bidder key, bid id]
    {
      pubkey: bidAccAddr,
      isSigner: false,
      isWritable: true,
    },
    ///   2. `[]` Token program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ///   3. `[]` System program
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];

  /// Optional - if bid made in tokens
  // if (currencyMint) {
  //   const buyerCurrencyTokenAccount = await getTokenAccount({
  //     connection: connection,
  //     owner: buyerWallet,
  //     mint: currencyMint,
  //   })
  //
  //   if (isNil(buyerCurrencyTokenAccount)) {
  //     throw new Error('buyerCurrencyTokenAccount is undefined')
  //   }
  //
  //   // BID_PRICE_PREFIX, bid key
  //   const bidCurrencyTokenAccountProgramAddress =
  //     await PublicKey.findProgramAddress(
  //       [Buffer.from(BID_PRICE_PREFIX), bidAccAddr.toBuffer()],
  //       MARKET_PROGRAM_ID
  //     )
  //
  //   const bidCurrencyTokenAccount = bidCurrencyTokenAccountProgramAddress[0]
  //   const bidCurrencyTokenAccountBump =
  //     bidCurrencyTokenAccountProgramAddress[1]
  //
  //   instructionAccounts.push(
  //     ...[
  //       ///   4. `[writable]` Bidder's token account where bid tokens go to (preferably ATA)
  //       {
  //         pubkey: buyerCurrencyTokenAccount,
  //         isSigner: false,
  //         isWritable: true,
  //       },
  //       ///   5. `[writable]` PDA token account holding bid tokens [BID_PRICE_PREFIX, bid key]
  //       {
  //         pubkey: bidCurrencyTokenAccount,
  //         isSigner: false,
  //         isWritable: true,
  //       },
  //       ///   6. `[]` Price mint account
  //       {
  //         pubkey: currencyMint,
  //         isSigner: false,
  //         isWritable: false,
  //       },
  //       ///   7. `[]` Rent sysvar
  //       {pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
  //       ///   8. `[]` ATA program
  //       {
  //         pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
  //         isSigner: false,
  //         isWritable: false,
  //       },
  //     ]
  //   )
  // }

  const transactionInstruction = new TransactionInstruction({
    programId: MARKET_PROGRAM_ID,
    keys: instructionAccounts,
    data,
  });

  tx.add(transactionInstruction);

  return { tx };
};
