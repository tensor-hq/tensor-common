import {
  AddressLookupTableAccount,
  ConfirmOptions,
  Connection,
  Finality,
  Keypair,
  LAMPORTS_PER_SOL,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { backOff } from 'exponential-backoff';
import { buildTxV0 } from '../solana_contrib';

export type BuildAndSendTxArgs = {
  conn: Connection;
  payer: Signer;
  ixs: TransactionInstruction[];
  extraSigners?: Signer[];
  opts?: ConfirmOptions;
  commitment?: Finality;
  // Prints out transaction (w/ logs) to stdout
  debug?: boolean;
  // Optional, if present signify that a V0 tx should be sent
  lookupTableAccounts?: [AddressLookupTableAccount] | undefined;
};

export const buildAndSendTx = async ({
  conn,
  payer,
  ixs,
  extraSigners,
  /** For tests, skip preflight so we can expect tx errors */
  opts,
  commitment = 'confirmed',
  debug,
  lookupTableAccounts,
}: BuildAndSendTxArgs) => {
  //build v0
  const { tx, blockhash, lastValidBlockHeight } = await backOff(
    () =>
      buildTxV0({
        connections: [conn],
        instructions: ixs,
        //have to add TEST_KEYPAIR here instead of wallet.signTx() since partialSign not impl on v0 txs
        additionalSigners: [payer, ...(extraSigners ?? [])],
        feePayer: payer.publicKey,
        addressLookupTableAccs: lookupTableAccounts ?? [],
      }),
    {
      // Retry blockhash errors (happens during tests sometimes).
      retry: (e: any) => {
        return e.message.includes('blockhash');
      },
    },
  );

  try {
    // Need to pass commitment here o/w it doesn't work...?
    if (debug) opts = { ...opts, commitment: 'confirmed' };
    const sig = await conn.sendTransaction(tx, {
      ...opts,
    });
    await conn.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      commitment,
    );
    if (debug) {
      console.log(
        await conn.getTransaction(sig, {
          commitment,
          maxSupportedTransactionVersion: 0,
        }),
      );
    }
    return sig;
  } catch (e) {
    //this is needed to see program error logs
    console.error('❌ FAILED TO SEND TX, FULL ERROR: ❌');
    console.error(e);
    throw e;
  }
};

export const createFundedWallet = async ({
  conn,
  payer,
  sol = 1000,
}: {
  conn: Connection;
  payer: Signer;
  sol?: number;
}): Promise<Keypair> => {
  const keypair = Keypair.generate();
  //airdrops are funky, best to move from provider wallet
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: keypair.publicKey,
      lamports: sol * LAMPORTS_PER_SOL,
    }),
  );
  await buildAndSendTx({ conn, payer, ixs: tx.instructions });
  return keypair;
};

export const makeNTraders = async ({
  conn,
  payer,
  n,
  sol,
}: {
  conn: Connection;
  payer: Keypair;
  n: number;
  sol?: number;
}) => {
  return await Promise.all(
    Array(n)
      .fill(null)
      .map(async () => await createFundedWallet({ conn, payer, sol })),
  );
};
