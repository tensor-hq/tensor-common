import {
  AccountInfo,
  AddressLookupTableAccount,
  Blockhash,
  BlockhashWithExpiryBlockHeight,
  Commitment,
  CompiledInstruction,
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  ConfirmOptions,
  Connection,
  Context,
  Finality,
  Message,
  MessageHeader,
  MessageV0,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  SignatureStatus,
  Signer,
  Transaction,
  TransactionError,
  TransactionInstruction,
  TransactionMessage,
  TransactionResponse,
  TransactionSignature,
  VersionedTransaction,
  VersionedTransactionResponse,
} from '@solana/web3.js';
import assert from 'assert';
import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { backOff } from 'exponential-backoff';
import { SECONDS, sleep, waitMS } from '../time';
import {
  Maybe,
  Overwrite,
  filterNullLike,
  isNullLike,
  makeBatches,
  settleAllWithTimeout,
} from '../utils';
import { TxV0WithHeight, TxWithHeight } from './types';
import { getIxDiscHex } from './anchor';

const BLOCK_TIME_MS = 400;

const DEFAULT_CONFIRM_OPTS: ConfirmOptions = {
  commitment: 'confirmed',
  //even if we're skipping preflight, this should be set to the same level as committment above
  //as per https://jstarry.notion.site/Transaction-confirmation-d5b8f4e09b9c4a70a1f263f82307d7ce
  preflightCommitment: 'confirmed',
  skipPreflight: true,
};
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_RETRY_MS = 2000;
const MAX_WAIT_BLOCKHEIGHT_MS = 10 * 1000;

export type ConfirmedTx = {
  txSig: TransactionSignature;
  slot: number;
  err: TransactionError | null;
};

type ResolveReference = {
  resolve?: () => void;
};

type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  debug: (msg: string) => void;
};

export type TransactionMessageJSON = {
  header: MessageHeader;
  accountKeys: string[];
  recentBlockhash: Blockhash;
  instructions: CompiledInstruction[];
};

export type TransactionJSON = Overwrite<
  TransactionResponse['transaction'],
  {
    message: TransactionMessageJSON;
  }
>;

export type TransactionResponseJSON = Overwrite<
  TransactionResponse,
  {
    transaction: TransactionJSON;
  }
>;

export type TransactionResponseAugmented = TransactionResponse & {
  v0LoadedAddresses?: {
    numWritableAccounts: number;
    numReadonlyAccounts: number;
  };
};

export type TransactionResponseAugmentedJSON = Overwrite<
  TransactionResponseAugmented,
  {
    transaction: TransactionJSON;
  }
>;

export const castTxResponseJSON = <T extends TransactionResponse>(
  tx: T,
): Overwrite<T, { transaction: TransactionJSON }> => {
  return {
    ...tx,
    transaction: {
      ...tx.transaction,
      message: castMessageJSON(tx.transaction.message),
    },
  };
};

export const castTxResponse = <T extends TransactionResponseJSON>(
  tx: T,
): Overwrite<T, { transaction: TransactionResponse['transaction'] }> => {
  return {
    ...tx,
    transaction: {
      ...tx.transaction,
      message: new Message(tx.transaction.message),
    },
  };
};

export const castMessageJSON = (msg: Message): TransactionMessageJSON => {
  return {
    ...msg,
    accountKeys: msg.accountKeys.map((k) => k.toBase58()),
  };
};

export class RetryTxSender {
  private done = false;
  private resolveReference: ResolveReference = {
    resolve: undefined,
  };
  private start?: number;
  private txSig?: TransactionSignature;
  private confirmedTx?: ConfirmedTx;

  constructor(
    readonly connection: Connection,
    readonly additionalConnections = new Array<Connection>(),
    //pass an optional logger object (can be console, can be winston) if you want verbose logs
    readonly logger?: Logger,
    readonly opts = DEFAULT_CONFIRM_OPTS,
    readonly timeout = DEFAULT_TIMEOUT_MS,
    readonly retrySleep = DEFAULT_RETRY_MS,
  ) {}

  async send(
    tx: Transaction | VersionedTransaction,
  ): Promise<TransactionSignature> {
    const rawTransaction = tx.serialize();
    const startTime = this._getTimestamp();

    try {
      this.txSig = await this.connection.sendRawTransaction(
        rawTransaction,
        this.opts,
      );
      this.logger?.info(`Begin processing: ${this.txSig}`);
      this.logger?.info(
        `🚀 [${this.txSig.substring(0, 5)}] tx sent to MAIN connection`,
      );
      this._sendToAdditionalConnections(rawTransaction);
    } catch (e) {
      this.logger?.error(`${JSON.stringify(e)}`);
      throw e;
    }

    //asynchronously keep retrying until done or timeout
    (async () => {
      while (!this.done && this._getTimestamp() - startTime < this.timeout) {
        this.logger?.info(
          `🔁 [${this.txSig?.substring(
            0,
            5,
          )}] begin new retry loop (sleeping for ${this.retrySleep / 1000}s)`,
        );
        await this._sleep();
        if (!this.done) {
          this.connection
            .sendRawTransaction(rawTransaction, this.opts)
            .catch((e) => {
              this.logger?.error(`${JSON.stringify(e)}`);
              this._stopWaiting();
            });
          this._sendToAdditionalConnections(rawTransaction);
        }
      }
    })();

    return this.txSig;
  }

  async tryConfirm(lastValidBlockHeight?: number): Promise<ConfirmedTx> {
    if (this.confirmedTx) {
      this.logger?.info('✅ Tx already confirmed');
      return this.confirmedTx;
    }

    if (!this.txSig) {
      throw new Error('you need to send the tx first');
    }

    try {
      const result = await this._confirmTransaction(
        this.txSig,
        lastValidBlockHeight,
      );
      this.confirmedTx = {
        txSig: this.txSig,
        slot: result.context.slot,
        err: result.value.err,
      };
      return this.confirmedTx;
    } catch (e) {
      this.logger?.error(`${JSON.stringify(e)}`);
      throw e;
    } finally {
      this._stopWaiting();
    }
  }

  private async _confirmTransaction(
    txSig: TransactionSignature,
    lastValidBlockHeight?: number,
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    this.logger?.info(
      `⏳ [${txSig.substring(0, 5)}] begin trying to confirm tx`,
    );

    let decodedSignature: Uint8Array;
    try {
      decodedSignature = bs58.decode(txSig);
    } catch (err) {
      throw new Error('signature must be base58 encoded: ' + txSig);
    }

    assert(decodedSignature.length === 64, 'signature has invalid length');

    this.start = Date.now();
    const subscriptionCommitment = this.opts.commitment;

    const subscriptionIds = new Array<number | undefined>();
    const connections = [this.connection, ...this.additionalConnections];
    let response: RpcResponseAndContext<SignatureResult> | null = null;

    const promises = connections
      .map((connection, i) => {
        let subscriptionId;

        const pollPromise = backOff(
          async () => {
            this.logger?.debug('[getSignatureStatus] Attept to get sig status');
            const { value, context } = await connection.getSignatureStatus(
              txSig,
              {
                searchTransactionHistory: true,
              },
            );
            if (!value) {
              this.logger?.debug(
                `[getSignatureStatus] sig status for ${txSig} not found, try again in ${this.retrySleep}`,
              );
              throw new Error(`sig status for ${txSig} not found`);
            }
            // This is possible, and the slot may != confirmed slot if minority node processed it.
            if (value.confirmationStatus === 'processed') {
              this.logger?.debug(
                `[getSignatureStatus] sig status for ${txSig} still in processed state, try again in ${this.retrySleep}`,
              );
              throw new Error(
                `sig status for ${txSig} still in processed state`,
              );
            }
            return {
              value,
              context,
            };
          },
          {
            maxDelay: this.retrySleep,
            startingDelay: this.retrySleep,
            numOfAttempts: Math.ceil(this.timeout / this.retrySleep),
            retry: (e) => {
              console.error(
                `[getSignatureStatus] received error, ${e} retrying`,
              );
              return !this.done;
            },
          },
        )
          .then((res) => {
            response = res;
          })
          .catch((err) => {
            this.logger?.error(
              `[${txSig.substring(0, 5)}] error polling: ${err}`,
            );
          });

        const wsPromise = new Promise((resolve) => {
          try {
            subscriptionId = connection.onSignature(
              txSig,
              (result: SignatureResult, context: Context) => {
                subscriptionIds[i] = undefined;
                response = {
                  context,
                  value: result,
                };
                resolve(null);
              },
              subscriptionCommitment,
            );
          } catch (err) {
            this.logger?.error(
              `[${txSig.substring(0, 5)}] error setting up onSig WS: ${err}`,
            );
            // Don't want this to cause everything else to fail during race.
            resolve(null);
          }
        });
        subscriptionIds.push(subscriptionId);
        return [wsPromise, pollPromise];
      })
      .flat();

    try {
      await this._racePromises(
        txSig,
        promises,
        this.timeout,
        lastValidBlockHeight,
      );
    } finally {
      for (const [i, subscriptionId] of subscriptionIds.entries()) {
        if (subscriptionId) {
          connections[i].removeSignatureListener(subscriptionId);
        }
      }
    }

    const duration = (Date.now() - this.start) / 1000;
    if (response === null) {
      const errMsg = `❌ [${txSig.substring(
        0,
        5,
      )}] NOT confirmed in ${duration.toFixed(2)}sec`;
      this.logger?.error(errMsg);
      throw new Error(errMsg);
    }

    if ((<RpcResponseAndContext<SignatureResult>>response).value.err) {
      this.logger?.warn(
        `⚠️ [${txSig.substring(
          0,
          5,
        )}] confirmed AS FAILED TX in ${duration.toFixed(2)}sec`,
      );
    } else {
      this.logger?.info(
        `✅ [${txSig.substring(0, 5)}] confirmed in ${duration.toFixed(2)}sec`,
      );
    }

    return response;
  }

  private _getTimestamp(): number {
    return new Date().getTime();
  }

  private _stopWaiting() {
    this.done = true;
    if (this.resolveReference.resolve) {
      this.resolveReference.resolve();
    }
  }

  private async _sleep(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveReference.resolve = resolve;
      setTimeout(resolve, this.retrySleep);
    });
  }

  //this will trigger faster than a timeout promise in the following situations:
  // 1)we've set too long of a timeout, typically > 90s
  // 2)the blockhash we got is outdated and eg is actually only valid for 10s, when timeout is 60s
  // 3)the validator is confirming blocks faster than 400ms, eg 200ms (possible, confirmed with Jacob) -> 151 slots will fly by faster
  private async _outdatedBlockHeightPromise(
    lastValidBlockHeight: number,
  ): Promise<null> {
    let currentHeight = await getLatestBlockHeight({
      connections: [this.connection, ...this.additionalConnections],
    });
    while (!this.done && currentHeight < lastValidBlockHeight) {
      const waitMs = Math.min(
        (lastValidBlockHeight - currentHeight) * BLOCK_TIME_MS,
        MAX_WAIT_BLOCKHEIGHT_MS,
      );
      this.logger?.debug(
        `current height is ${
          lastValidBlockHeight - currentHeight
        } below lastValidBlockHeight, waiting ${waitMs}ms before checking again...`,
      );
      await waitMS(waitMs);
      currentHeight = await getLatestBlockHeight({
        connections: [this.connection, ...this.additionalConnections],
      });
    }
    if (currentHeight > lastValidBlockHeight) {
      this.logger?.error(
        `❌ [${this.txSig?.substring(0, 5)}] current height ${
          currentHeight - lastValidBlockHeight
        } blocks > lastValidBlockHeight, aborting`,
      );
    }
    return null;
  }

  private _racePromises<T>(
    txSig: TransactionSignature,
    promises: Promise<T>[],
    timeoutMs: number,
    lastValidBlockHeight?: number,
  ): Promise<T | null> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutId = setTimeout(() => {
        this.logger?.warn(`[${txSig}] timeout waiting for sig`);
        resolve(null);
      }, timeoutMs);
    });

    const promisesToRace = [...promises, timeoutPromise];
    if (lastValidBlockHeight) {
      promisesToRace.push(
        this._outdatedBlockHeightPromise(lastValidBlockHeight),
      );
    }

    return Promise.race(promisesToRace).then((result: T | null) => {
      clearTimeout(timeoutId);
      return result;
    });
  }

  private _sendToAdditionalConnections(rawTx: Uint8Array): void {
    this.additionalConnections.map((connection) => {
      connection.sendRawTransaction(rawTx, this.opts).catch((e) => {
        this.logger?.error(
          // @ts-ignore
          `error sending tx to additional connection ${connection._rpcEndpoint}: ${e}`,
        );
      });
    });
    this.logger?.info(
      `💥 [${this.txSig?.substring(0, 5)}] tx sent to ${
        this.additionalConnections.length
      } ADDITIONAL connections`,
    );
  }

  addAdditionalConnection(newConnection: Connection): void {
    const alreadyUsingConnection =
      this.additionalConnections.filter((connection) => {
        return connection.rpcEndpoint === newConnection.rpcEndpoint;
      }).length > 0;

    if (!alreadyUsingConnection) {
      this.additionalConnections.push(newConnection);
    }
  }
}

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

//Do NOT use Uint8Array as output, this would cause all kinds of serialization problems in graphql
export const serializeAnyVersionTx = (
  tx: Transaction | VersionedTransaction,
  verifySignatures = false,
): number[] => {
  if (tx instanceof Transaction) {
    return tx.serialize({ verifySignatures }).toJSON().data;
  } else if (tx instanceof VersionedTransaction) {
    //verify signatures = always false
    return Array.from(tx.serialize());
  } else {
    // This is to handle weird wallet adapters that don't return Transaction/VersionedTransaction objects.
    const unkTx = tx as any;
    try {
      return unkTx.serialize({ verifySignatures }).toJSON().data;
    } catch (err) {
      console.error(err);
      try {
        return Array.from(unkTx.serialize());
      } catch (err) {
        console.error(err);
        throw new Error('unknown tx type');
      }
    }
  }
};

export type ExtractedIx = {
  rawIx: CompiledInstruction;
  /** Index of top-level instruction. */
  ixIdx: number;
  /** Presence of field = it's a top-level ix; absence = inner ix itself. */
  innerIxs?: CompiledInstruction[];
  noopIxs?: CompiledInstruction[];
};

export const extractAllIxs = ({
  tx,
  programId,
  noopIxDiscHex,
}: {
  tx: TransactionResponse | TransactionResponseJSON;
  /** If passed, will filter for ixs w/ this program ID. */
  programId?: PublicKey;
  /** If passed WITH programId, will attach self-CPI noop ixs to corresponding programId ixs. NB: noopIxs are included in the final array too. */
  noopIxDiscHex?: string;
}) => {
  const outIxs: ExtractedIx[] = [];
  const msg = tx.transaction.message;
  const programIdIndex = programId
    ? msg.accountKeys.findIndex((k) => new PublicKey(k).equals(programId))
    : null;

  const maybeAttachNoopIx = (ix: CompiledInstruction) => {
    if (isNullLike(programIdIndex || programIdIndex !== ix.programIdIndex))
      return;
    if (getIxDiscHex(ix.data) !== noopIxDiscHex) return;
    const prev = outIxs.at(-1);
    if (isNullLike(prev)) return;
    prev.noopIxs ??= [];
    prev.noopIxs.push(ix);
  };

  const addIx = (
    ix: CompiledInstruction,
    ixIdx: number,
    innerIxs: CompiledInstruction[] | undefined,
  ) => {
    if (!isNullLike(programIdIndex) && programIdIndex !== ix.programIdIndex)
      return;

    maybeAttachNoopIx(ix);
    outIxs.push({
      rawIx: ix,
      ixIdx,
      innerIxs,
    });
  };

  tx.transaction.message.instructions.forEach((ix, ixIdx) => {
    const innerIxs =
      tx.meta?.innerInstructions?.find((inner) => inner.index === ixIdx)
        ?.instructions ?? [];

    addIx(ix, ixIdx, innerIxs);

    innerIxs.forEach((innerIx) => {
      addIx(innerIx, ixIdx, undefined);
    });
  });

  return outIxs;
};

export const legacyToV0Tx = (
  legacy: Buffer | Uint8Array | Array<number>,
): VersionedTransaction => {
  return new VersionedTransaction(Transaction.from(legacy).compileMessage());
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

// NB: use this o/w the getAccountKey fn on VersionedTransactionResponse from Geyser/RPC doesn't work...
export const getAccountKeys = (tx: VersionedTransactionResponse) => {
  return [
    ...(tx.transaction.message.staticAccountKeys ?? []),
    ...(tx.meta?.loadedAddresses?.writable ?? []),
    ...(tx.meta?.loadedAddresses?.readonly ?? []),
  ];
};

/** converts the new v0 tx type to legacy so that our downstream parser works as expected */
export const convertTxToLegacy = (
  tx: VersionedTransactionResponse,
): TransactionResponseAugmented => {
  // Okay this is really fucking weird, but here is the observed behavior:
  // JSON RPC getTransaction:
  // - legacy: in TransactionResponse format
  // - v0: in VersionedTransactionResponse format
  // Geyser SQS:
  // - legacy & v0 in VersionedTransactionResponse

  //handle TransactionResponse/legacy format, return as is
  if (
    (tx.version === undefined ||
      tx.version === null ||
      tx.version === 'legacy') &&
    !('compiledInstructions' in tx.transaction.message)
  ) {
    return tx as TransactionResponse;
  }
  //handle VersionedTransactionResponse
  const v0msg = tx.transaction.message as MessageV0;
  const legacyMsg = new Message({
    header: v0msg.header,
    accountKeys: getAccountKeys(tx),
    instructions: v0msg.compiledInstructions.map((i) => {
      const { accountKeyIndexes, ...rest } = i;
      return {
        ...rest,
        accounts: accountKeyIndexes,
        //when parsing a JSON file, this field is a stringified buffer ({type: Buffer, data: [1,2,3]})
        data:
          'data' in i.data
            ? bs58.encode(Uint8Array.from((i.data as any).data))
            : bs58.encode(i.data),
      };
    }),
    recentBlockhash: v0msg.recentBlockhash,
  });
  return {
    ...tx,
    meta: tx.meta
      ? {
          ...tx.meta,
          loadedAddresses: {
            readonly: [],
            writable: [],
          },
        }
      : null,
    transaction: {
      ...tx.transaction,
      message: legacyMsg,
    },
    v0LoadedAddresses: {
      numReadonlyAccounts: tx.meta?.loadedAddresses?.readonly?.length ?? 0,
      numWritableAccounts: tx.meta?.loadedAddresses?.writable?.length ?? 0,
    },
  };
};

/** gets new v0 and legacy transactions with the old TransactionResponse format */
export const getTransactionConvertedToLegacy = async (
  conn: Connection,
  sig: string,
  commitment: Finality = 'confirmed',
): Promise<TransactionResponse | null> => {
  const tx: VersionedTransactionResponse | null = await conn.getTransaction(
    sig,
    {
      commitment,
      maxSupportedTransactionVersion: 0,
    },
  );
  if (!tx) return null;
  return convertTxToLegacy(tx);
};

// Current max compute per tx.
export const MAX_COMPUTE_UNITS = 1_400_000;
/** Adds (1) increase compute + (2) priority fees */
export const prependComputeIxs = (
  ixs: TransactionInstruction[],
  compute?: Maybe<number>,
  priorityMicroLamports?: Maybe<number>,
): TransactionInstruction[] => {
  const out = [...ixs];
  if (
    compute &&
    !ixs.some(
      (ix) =>
        ix.programId.equals(ComputeBudgetProgram.programId) &&
        ComputeBudgetInstruction.decodeInstructionType(ix) ===
          'SetComputeUnitLimit',
    )
  ) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: Math.min(MAX_COMPUTE_UNITS, compute),
    });
    out.splice(0, 0, modifyComputeUnits);
  }
  if (
    priorityMicroLamports &&
    !ixs.some(
      (ix) =>
        ix.programId.equals(ComputeBudgetProgram.programId) &&
        ComputeBudgetInstruction.decodeInstructionType(ix) ===
          'SetComputeUnitPrice',
    )
  ) {
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityMicroLamports,
    });
    out.splice(0, 0, addPriorityFee);
  }
  return out;
};
