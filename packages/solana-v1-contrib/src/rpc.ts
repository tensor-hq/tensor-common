import {
  AccountInfo,
  AddressLookupTableAccount,
  BlockhashWithExpiryBlockHeight,
  Commitment,
  Connection,
  PublicKey,
  RpcResponseAndContext,
  SignatureStatus,
  Signer,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  filterNullLike,
  makeBatches,
  settleAllWithTimeout,
  sleep,
} from '@tensor-hq/ts-utils';
import { Buffer } from 'buffer';
import { backOff } from 'exponential-backoff';
import { TxV0WithHeight, TxWithHeight } from '.';

type MaybeBlockhash =
  | { type: 'blockhash'; blockhash: string }
  | { type: 'blockhashArgs'; args: GetRpcMultipleConnsArgs };
type BuildTxArgs = {
  feePayer: PublicKey;
  instructions: TransactionInstruction[];
  additionalSigners?: Array<Signer>;
  maybeBlockhash: MaybeBlockhash;
};

const maybeFetchBlockhash = async (maybeBlockhash: MaybeBlockhash) => {
  let blockhash;
  let lastValidBlockHeight;
  if (maybeBlockhash.type === 'blockhash') {
    blockhash = maybeBlockhash.blockhash;
    lastValidBlockHeight = null;
  } else {
    const {
      blockhash: blockhash_,
      lastValidBlockHeight: lastValidBlockHeight_,
    } = await getLatestBlockhashMultConns(maybeBlockhash.args);
    blockhash = blockhash_;
    lastValidBlockHeight = lastValidBlockHeight_;
  }
  return { blockhash, lastValidBlockHeight };
};

//(!) this should be the only function across our code used to build txs
// reason: we want to control how blockchash is constructed to minimize tx failures
export const buildTx = async ({
  feePayer,
  instructions,
  additionalSigners,
  maybeBlockhash,
}: BuildTxArgs): Promise<TxWithHeight> => {
  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }

  const tx = new Transaction();
  tx.add(...instructions);
  tx.feePayer = feePayer;

  const { blockhash, lastValidBlockHeight } = await maybeFetchBlockhash(
    maybeBlockhash,
  );
  tx.recentBlockhash = blockhash;
  if (!!lastValidBlockHeight) {
    tx.lastValidBlockHeight = lastValidBlockHeight;
  }

  if (additionalSigners) {
    additionalSigners
      .filter((s): s is Signer => s !== undefined)
      .forEach((kp) => {
        tx.partialSign(kp);
      });
  }

  return { tx, blockhash, lastValidBlockHeight };
};

export const buildTxV0 = async ({
  feePayer,
  instructions,
  additionalSigners,
  addressLookupTableAccs,
  maybeBlockhash,
}: {
  addressLookupTableAccs: AddressLookupTableAccount[];
} & BuildTxArgs): Promise<TxV0WithHeight> => {
  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }

  const { blockhash, lastValidBlockHeight } = await maybeFetchBlockhash(
    maybeBlockhash,
  );

  const msg = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message(addressLookupTableAccs);
  const tx = new VersionedTransaction(msg);

  if (additionalSigners) {
    tx.sign(additionalSigners.filter((s): s is Signer => s !== undefined));
  }

  return { tx, blockhash, lastValidBlockHeight };
};

export const buildTxsLegacyV0 = async ({
  feePayer,
  instructions,
  additionalSigners,
  addressLookupTableAccs,
  maybeBlockhash,
}: {
  addressLookupTableAccs: AddressLookupTableAccount[];
} & BuildTxArgs) => {
  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }

  const { blockhash, lastValidBlockHeight } = await maybeFetchBlockhash(
    maybeBlockhash,
  );

  const msg = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions,
  });
  const tx = new Transaction().add(...instructions);
  tx.recentBlockhash = blockhash;
  tx.feePayer = feePayer;
  if (lastValidBlockHeight) {
    tx.lastValidBlockHeight = lastValidBlockHeight;
  }
  const txV0 = new VersionedTransaction(
    msg.compileToV0Message(addressLookupTableAccs),
  );

  if (additionalSigners) {
    const signers = filterNullLike(additionalSigners);
    signers.forEach((kp) => {
      tx.partialSign(kp);
    });
    txV0.sign(signers);
  }

  return { tx, txV0, blockhash, lastValidBlockHeight };
};

type GetRpcMultipleConnsArgs = {
  ///(!) ideally this should be the same RPC node that will then try to send/confirm the tx
  connections: Array<Connection>;
  commitment?: Commitment;
  /// Exp backoff params for blockhash.
  maxRetries?: number;
  startTimeoutMs?: number;
  maxTimeoutMs?: number;
};

export const getLatestBlockhashMultConns = async ({
  connections,
  commitment = 'confirmed',
  maxRetries = 5,
  startTimeoutMs = 100,
  maxTimeoutMs = 2000,
}: GetRpcMultipleConnsArgs): Promise<BlockhashWithExpiryBlockHeight> => {
  let retries = 0;
  let timeoutMs = startTimeoutMs;
  let blockhashes: RpcResponseAndContext<BlockhashWithExpiryBlockHeight>[] = [];

  while (blockhashes.length < 1 && retries < maxRetries) {
    //poll blockhashes from multiple providers, then take the one from RPC with latest slot
    //as per advice here https://jstarry.notion.site/Transaction-confirmation-d5b8f4e09b9c4a70a1f263f82307d7ce
    blockhashes = await settleAllWithTimeout(
      connections.map((c) => c.getLatestBlockhashAndContext(commitment)),
      timeoutMs,
    );
    retries++;
    timeoutMs = Math.min(timeoutMs * 2, maxTimeoutMs);
  }

  if (!blockhashes.length) {
    throw new Error(
      `failed to fetch blockhash from ${connections.length} providers`,
    );
  }

  // (!) Regression: sorting by slot is not enough: eg a stale blockhash RPC can still return a newer
  // slot than the rest. lastValidBlockHeight should correspond 1:1.
  return blockhashes.sort(
    (a, b) => b.value.lastValidBlockHeight - a.value.lastValidBlockHeight,
  )[0].value;
};

/**
 * Races multiple connections to confirm a tx.
 *
 * This will throw TransactionExpiredBlockheightExceededError
 * if we cannot confirm by the tx's lastValidBlockHeight.
 */
export const confirmTransactionMultConns = async ({
  conns,
  sig,
  timeoutMs = 60 * 1000,
  maxDelayMs = 10 * 1000,
  startingDelayMs = 3 * 1000,
  numOfAttempts = 7,
}: {
  conns: Connection[];
  sig: string;
  timeoutMs?: number;
  maxDelayMs?: number;
  startingDelayMs?: number;
  numOfAttempts?: number;
}) => {
  return await Promise.race<RpcResponseAndContext<SignatureStatus>>([
    new Promise((_, rej) =>
      setTimeout(
        () => rej(new Error(`confirming ${sig} timeout exceed ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
    // LOL this doesn't actually work for old sigs wtf.
    // ...conns.map(async (c) =>
    //   // Backoff in case one of the RPCs is acting up: hopefully the other will out-race a confirmation.
    //   backOff(() => c.confirmTransaction(args), {
    //     retry: (e) => {
    //       return !(e instanceof TransactionExpiredBlockheightExceededError);
    //     },
    //   })
    // ),
    ...conns.map(async (c) =>
      backOff(
        async () => {
          const { value, context } = await c.getSignatureStatus(sig, {
            searchTransactionHistory: true,
          });
          if (!value) throw new Error(`sig status for ${sig} not found`);
          // This is possible, and the slot may != confirmed slot if minority node processed it.
          if (value.confirmationStatus === 'processed')
            throw new Error(`sig status for ${sig} still in processed state`);
          return {
            value,
            context,
          };
        },
        {
          maxDelay: maxDelayMs,
          startingDelay: startingDelayMs,
          numOfAttempts,
        },
      ),
    ),
  ]);
};

export const getLatestBlockHeight = async ({
  connections,
  commitment = 'confirmed',
  maxRetries = 5,
  startTimeoutMs = 100,
  maxTimeoutMs = 2000,
}: GetRpcMultipleConnsArgs) => {
  let retries = 0;
  let timeoutMs = startTimeoutMs;
  let heights: number[] = [];

  while (heights.length < 1 && retries < maxRetries) {
    //poll heights from multiple providers, then take the one from RPC with latest slot
    //as per advice here https://jstarry.notion.site/Transaction-confirmation-d5b8f4e09b9c4a70a1f263f82307d7ce
    heights = await settleAllWithTimeout(
      connections.map((c) => c.getBlockHeight(commitment)),
      timeoutMs,
    );
    retries++;
    timeoutMs = Math.min(timeoutMs * 2, maxTimeoutMs);
  }

  if (!heights.length) {
    throw new Error(
      `failed to fetch height from ${connections.length} providers`,
    );
  }

  return Math.max(...heights);
};

const MIN_SLOT_MS = 400;
// In case we get a flaky slot from a bad RPC (o/w we may end up waiting A LONG time = stuck).
const MAX_WAIT_UNTIL_MS = 5 * 1000;

type AccountWithSlot = {
  slot: number;
  account: AccountInfo<Buffer> | null;
  pubkey: PublicKey;
};

/** Use this vs getAccountInfo w/ minContextSlot since minContextSlot just spam retries.
 * See getMultiAccountsWaitSlot if you have a batch of accounts.  */
export const getAccountWaitSlot = async ({
  conn,
  slot,
  pubkey,
  beforeHook,
  retries = 5,
}: {
  conn: Connection;
  slot: number;
  pubkey: PublicKey;
  /** Hook right before RPC call */
  beforeHook?: () => Promise<void>;
  /** Retries for connection request. */
  retries?: number;
}): Promise<AccountWithSlot> => {
  let curSlot: number;
  let account: AccountInfo<Buffer> | null;
  while (true) {
    ({
      context: { slot: curSlot },
      // Will be null if account cannot be found.
      value: account,
    } = await backOff(
      async () => {
        await beforeHook?.();
        return await conn.getAccountInfoAndContext(pubkey);
      },
      {
        numOfAttempts: retries,
      },
    ));
    // Need to wait for slot AFTER the tx.
    if (curSlot > slot) break;

    const interval = Math.min(
      Math.ceil(Math.max(1, slot - curSlot) * MIN_SLOT_MS),
      MAX_WAIT_UNTIL_MS,
    );

    console.warn(
      `retrieve pda ${pubkey.toBase58()} with pda slot ${curSlot} <= tx slot ${slot}, waiting ${interval}ms and retrying...`,
    );
    await sleep({ Millis: interval });
  }

  return { slot: curSlot, account, pubkey };
};

export const getMultipleAccountsWaitSlot = async ({
  conn,
  slot,
  pubkeys,
  beforeHook,
  retries = 5,
}: {
  conn: Connection;
  slot: number;
  pubkeys: PublicKey[];
  /** Hook right before RPC call */
  beforeHook?: () => Promise<void>;
  /** Retries for connection request. */
  retries?: number;
}): Promise<AccountWithSlot[]> => {
  return (
    await Promise.all(
      makeBatches(pubkeys, 100).map(async (batch, batchIdx) => {
        let curSlot: number;
        let accounts: (AccountInfo<Buffer> | null)[];
        while (true) {
          ({
            context: { slot: curSlot },
            // Will be null if account cannot be found.
            value: accounts,
          } = await backOff(
            async () => {
              await beforeHook?.();
              return await conn.getMultipleAccountsInfoAndContext(batch);
            },
            {
              numOfAttempts: retries,
            },
          ));
          // Need to wait for slot AFTER the tx.
          if (curSlot > slot) break;

          const interval = Math.min(
            Math.ceil(Math.max(1, slot - curSlot) * MIN_SLOT_MS),
            MAX_WAIT_UNTIL_MS,
          );

          console.warn(
            `retrieve pda for ${
              batch.length
            } keys (batch ${batchIdx}, first: ${batch[0].toBase58()}) with pda slot ${curSlot} <= tx slot ${slot}, waiting ${interval}ms and retrying...`,
          );
          await sleep({ Millis: interval });
        }
        return accounts.map((account, idx) => ({
          slot: curSlot,
          account,
          pubkey: batch[idx],
        }));
      }),
    )
  ).flat();
};
