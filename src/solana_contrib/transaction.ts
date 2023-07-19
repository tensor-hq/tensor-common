import {
  AddressLookupTableAccount,
  BlockhashWithExpiryBlockHeight,
  Commitment,
  CompiledInnerInstruction,
  CompiledInstruction,
  ConfirmOptions,
  Connection,
  Context,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  Signer,
  Transaction,
  TransactionError,
  TransactionInstruction,
  TransactionMessage,
  TransactionResponse,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js';
import assert from 'assert';
import bs58 from 'bs58';
import { waitMS } from '../time';
import { filterNullLike, isNullLike, settleAllWithTimeout } from '../utils';
import { TxV0WithHeight, TxWithHeight } from './types';
import { Buffer } from 'buffer';

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
          )}] begin new retry loop (sleeping for ${DEFAULT_RETRY_MS / 1000}s)`,
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

    let decodedSignature;
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
    const promises = connections.map((connection, i) => {
      let subscriptionId;
      const confirmPromise = new Promise((resolve) => {
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
      return confirmPromise;
    });

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

type BuildTxArgs = {
  feePayer: PublicKey;
  instructions: TransactionInstruction[];
  additionalSigners?: Array<Signer>;
} & GetRpcMultipleConnsArgs;

//(!) this should be the only function across our code used to build txs
// reason: we want to control how blockchash is constructed to minimize tx failures
export const buildTx = async ({
  feePayer,
  instructions,
  additionalSigners,
  ...blockhashArgs
}: BuildTxArgs): Promise<TxWithHeight> => {
  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }

  const tx = new Transaction();
  tx.add(...instructions);
  tx.feePayer = feePayer;

  const { blockhash, lastValidBlockHeight } = await getLatestBlockhashMultConns(
    blockhashArgs,
  );
  tx.recentBlockhash = blockhash;

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
  ...blockhashArgs
}: {
  addressLookupTableAccs: AddressLookupTableAccount[];
} & BuildTxArgs): Promise<TxV0WithHeight> => {
  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }

  const { blockhash, lastValidBlockHeight } = await getLatestBlockhashMultConns(
    blockhashArgs,
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
  ...blockhashArgs
}: {
  addressLookupTableAccs: AddressLookupTableAccount[];
} & BuildTxArgs) => {
  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }

  const { blockhash, lastValidBlockHeight } = await getLatestBlockhashMultConns(
    blockhashArgs,
  );

  const msg = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions,
  });
  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer,
  }).add(...instructions);
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

export const extractAllIxs = (
  tx: TransactionResponse,
  /// If passed, will filter for ixs w/ this program ID.
  programId?: PublicKey,
): {
  rawIx: CompiledInstruction;
  ixIdx: number;
  /// Presence of field = it's a top-level ix; absence = inner ix itself.
  innerIxs?: CompiledInstruction[];
}[] => {
  const message = tx.transaction.message;

  let allIxs = [
    // Top-level ixs.
    ...message.instructions.map((rawIx, ixIdx) => ({
      rawIx,
      ixIdx,
      innerIxs:
        tx.meta?.innerInstructions?.find(({ index }) => index === ixIdx)
          ?.instructions ?? [],
    })),
    // Inner ixs (eg in CPI calls).
    // TODO: do we need to filter out self-CPI subixs?
    ...(tx.meta?.innerInstructions?.flatMap(({ instructions, index }) =>
      instructions.map((rawIx) => ({ rawIx, ixIdx: index })),
    ) ?? []),
  ];

  if (!isNullLike(programId)) {
    const programIdIndex = message.accountKeys.findIndex((k) =>
      k.equals(programId),
    );
    allIxs = allIxs.filter(
      ({ rawIx }) => rawIx.programIdIndex === programIdIndex,
    );
  }

  return allIxs;
};

export const legacyToV0Tx = (
  legacy: Buffer | Uint8Array | Array<number>,
): VersionedTransaction => {
  return new VersionedTransaction(Transaction.from(legacy).compileMessage());
};
