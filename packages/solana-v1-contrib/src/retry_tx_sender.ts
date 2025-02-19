import {
  ConfirmOptions,
  Connection,
  Context,
  RpcResponseAndContext,
  SignatureResult,
  Transaction,
  TransactionError,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js';
import { isNullLike, waitMS } from '@tensor-hq/ts-utils';
import bs58 from 'bs58';
import { backOff } from 'exponential-backoff';
import { getLatestBlockHeight } from './rpc';
import { VersionedTransactionResponse } from '@solana/web3.js';

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

type ConfirmOpts = {
  disableWs?: boolean;
};
export class RetryTxSender {
  private done = false;
  private resolveReference: ResolveReference = {
    resolve: undefined,
  };
  private cancelReference: ResolveReference = {
    resolve: undefined,
  };
  private start?: number;
  private txSig?: TransactionSignature;
  private confirmedTx?: ConfirmedTx;
  private fetchedTx?: VersionedTransactionResponse;
  readonly connection: Connection;
  readonly additionalConnections: Connection[];
  readonly logger?: Logger;
  readonly opts: ConfirmOptions;
  readonly timeout: number;
  readonly retrySleep: number;

  constructor({
    connection,
    additionalConnections = new Array<Connection>(),
    logger,
    txSig,
    opts = DEFAULT_CONFIRM_OPTS,
    timeout = DEFAULT_TIMEOUT_MS,
    retrySleep = DEFAULT_RETRY_MS,
  }: {
    connection: Connection;
    additionalConnections?: Connection[];
    /** pass an optional logger object (can be console, can be winston) if you want verbose logs */
    logger?: Logger;
    /** pass an optional txSig if you want to confirm at signature without resending it. */
    txSig?: string;
    opts?: typeof DEFAULT_CONFIRM_OPTS;
    timeout?: number;
    retrySleep?: number;
  }) {
    this.connection = connection;
    this.additionalConnections = additionalConnections;
    this.logger = logger;
    this.txSig = txSig;
    this.opts = opts;
    this.timeout = timeout;
    this.retrySleep = retrySleep;
  }

  /**
   * Send transaction to RPCs and asynchronously retry sending until
   *   1. The transaction is confirmed via tryConfirm/tryFetchTx
   *   2. The transaction times out
   *   3. Confirmation is cancelled via cancelConfirm
   */
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
            .then(() => {
              this.logger?.info(
                `🚀 [${this.txSig?.substring(
                  0,
                  5,
                )}] tx sent to MAIN connection, retrying in  ${
                  this.retrySleep
                }ms`,
              );
            })
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

  /**
   * Confirm the status of a transaction sent by this sender by
   *   1. Polling getSignatureStatus
   *   2. Optionally listening for the onSignature WS event
   *
   * Stops polling once
   *   1. The transaction is confirmed
   *   2. The transaction times out (via timeout promise or lastValidBlockHeight)
   *   3. Confirmation is cancelled via cancelConfirm
   *
   * Notes:
   *   * After confirming, subsequent calls will return a cached ConfirmedTx
   *   * tryConfirm should not be invoked multiple times in parallel
   *   * tryConfirm should not be invoked in parallel with tryFetchTx
   *
   * @param lastValidBlockHeight cancel tx confirmation loop once this block height is reached
   * @param opts {
   *   @param disableWs don't listen for onSignature WS events when confirming
   * }
   */
  async tryConfirm(
    lastValidBlockHeight?: number,
    opts?: ConfirmOpts,
  ): Promise<ConfirmedTx> {
    if (this.confirmedTx) {
      this.logger?.info('✅ Tx already confirmed');
      return this.confirmedTx;
    }

    if (!this.txSig) {
      throw new Error('you need to send the tx first');
    }

    this.done = false;
    try {
      const result = await this._confirmTransaction(
        this.txSig,
        lastValidBlockHeight,
        opts,
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

  /**
   * Fetch a transaction sent by this sender by polling getTransaction.
   *
   * Stops polling once
   *   1. The transaction is fetched
   *   2. The transaction times out (via timeout promise or lastValidBlockHeight)
   *   3. Confirmation is cancelled via cancelConfirm
   *
   * Notes:
   *   * After confirming, subsequent calls will return a cached tx
   *   * tryFetchTx should not be invoked multiple times in parallel
   *   * tryFetchTx should not be invoked in parallel with tryConfirm
   *
   * @param lastValidBlockHeight cancel tx confirmation loop once this block height is reached
   * @param opts {
   *   @param disableWs don't listen for onSignature WS events when confirming
   * }
   */
  async tryFetchTx(
    lastValidBlockHeight?: number,
  ): Promise<VersionedTransactionResponse> {
    if (this.fetchedTx) {
      this.logger?.info('✅ Tx already fetched');
      return this.fetchedTx;
    }

    if (!this.txSig) {
      throw new Error('you need to send the tx first');
    }

    this.done = false;
    try {
      this.fetchedTx = await this._fetchTransaction(
        this.txSig,
        lastValidBlockHeight,
      );
      this.confirmedTx = {
        txSig: this.txSig,
        slot: this.fetchedTx.slot,
        err: this.fetchedTx.meta?.err ?? null,
      };
      return this.fetchedTx;
    } catch (e) {
      this.logger?.error(`${JSON.stringify(e)}`);
      throw e;
    } finally {
      this._stopWaiting();
    }
  }

  cancelConfirm() {
    if (this.cancelReference.resolve) {
      this.cancelReference.resolve();
    }
  }

  private async _confirmTransaction(
    txSig: TransactionSignature,
    lastValidBlockHeight?: number,
    opts?: ConfirmOpts,
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

    if (decodedSignature.length !== 64) {
      throw new Error(
        `signature has invalid length ${decodedSignature.length} (expected 64)`,
      );
    }

    this.start = Date.now();
    const subscriptionCommitment = this.opts.commitment;

    const subscriptionIds = new Array<number | undefined>();
    const wsResolveRefs = new Array<ResolveReference>();
    const connections = [this.connection, ...this.additionalConnections];
    let response: RpcResponseAndContext<SignatureResult> | null = null;

    const promises = connections
      .map((connection, i) => {
        let subscriptionId;

        const pollPromise = backOff(
          async () => {
            this.logger?.debug(
              '[getSignatureStatus] Attempt to get sig status',
            );
            const { value, context } = await connection.getSignatureStatus(
              txSig,
              {
                searchTransactionHistory: true,
              },
            );
            if (!value) {
              this.logger?.debug(
                `[getSignatureStatus] sig status for ${txSig} not found, try again in ${this.retrySleep}ms`,
              );
              throw new Error(`sig status for ${txSig} not found`);
            }
            // This is possible, and the slot may != confirmed slot if minority node processed it.
            if (value.confirmationStatus === 'processed') {
              this.logger?.debug(
                `[getSignatureStatus] sig status for ${txSig} still in processed state, try again in ${this.retrySleep}ms`,
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
              if (
                typeof e.message === 'string' &&
                e.message.endsWith('not found')
              ) {
                this.logger?.info(`sig ${txSig} not found yet, retrying`);
              } else {
                console.error(
                  `[getSignatureStatus] received error, ${e} retrying`,
                );
              }
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

        if (opts?.disableWs) return [pollPromise];

        const wsPromise = new Promise<null>((resolve) => {
          try {
            wsResolveRefs.push({ resolve: () => resolve(null) });
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
        if (!isNullLike(subscriptionId)) {
          connections[i].removeSignatureListener(subscriptionId);
        }
      }
      wsResolveRefs.forEach((resolveRef) => resolveRef.resolve?.());
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

  private async _fetchTransaction(
    txSig: TransactionSignature,
    lastValidBlockHeight?: number,
  ): Promise<VersionedTransactionResponse> {
    this.logger?.info(`⏳ [${txSig.substring(0, 5)}] begin trying to fetch tx`);

    let decodedSignature: Uint8Array;
    try {
      decodedSignature = bs58.decode(txSig);
    } catch (err) {
      throw new Error('signature must be base58 encoded: ' + txSig);
    }

    if (decodedSignature.length !== 64) {
      throw new Error(
        `signature has invalid length ${decodedSignature.length} (expected 64)`,
      );
    }

    this.start = Date.now();
    const connections = [this.connection, ...this.additionalConnections];
    let response: VersionedTransactionResponse | null = null;

    const promises = connections.map((connection) =>
      backOff(
        async () => {
          this.logger?.debug('[getTransaction] Attempt to get sig status');
          const maybeTx = await connection.getTransaction(txSig, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          });
          if (!maybeTx) {
            this.logger?.debug(
              `[getTransaction] tx ${txSig} not found, try again in ${this.retrySleep}ms`,
            );
            throw new Error(`tx ${txSig} not found`);
          }
          return maybeTx;
        },
        {
          maxDelay: this.retrySleep,
          startingDelay: this.retrySleep,
          numOfAttempts: Math.ceil(this.timeout / this.retrySleep),
          retry: (e) => {
            if (
              typeof e.message === 'string' &&
              e.message.endsWith('not found')
            ) {
              this.logger?.info(`sig ${txSig} not found yet, retrying`);
            } else {
              console.error(`[getTransaction] received error, ${e} retrying`);
            }
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
        }),
    );

    await this._racePromises(
      txSig,
      promises,
      this.timeout,
      lastValidBlockHeight,
    );

    const duration = (Date.now() - this.start) / 1000;
    if (response === null) {
      const errMsg = `❌ [${txSig.substring(
        0,
        5,
      )}] NOT confirmed in ${duration.toFixed(2)}sec`;
      this.logger?.error(errMsg);
      throw new Error(errMsg);
    }

    if ((<VersionedTransactionResponse>response).meta?.err) {
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
    let timeoutResolve: (value: PromiseLike<null> | null) => void;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutResolve = resolve;
      timeoutId = setTimeout(() => {
        this.logger?.warn(`[${txSig}] timeout waiting for sig`);
        resolve(null);
      }, timeoutMs);
    });

    let cancelResolve: (value: PromiseLike<null> | null) => void;
    const cancelPromise = new Promise<null>((resolve) => {
      cancelResolve = resolve;
      this.cancelReference.resolve = () => {
        const errMsg = `[${txSig}] ⚠️ confirmation CANCELLED`;
        this.logger?.warn(errMsg);
        resolve(null);
      };
    });

    const promisesToRace = [...promises, timeoutPromise, cancelPromise];
    if (lastValidBlockHeight) {
      promisesToRace.push(
        this._outdatedBlockHeightPromise(lastValidBlockHeight),
      );
    }

    return Promise.race(promisesToRace).then((result: T | null) => {
      timeoutResolve(null);
      clearTimeout(timeoutId);
      cancelResolve(null);
      return result;
    });
  }

  private _sendToAdditionalConnections(rawTx: Uint8Array): void {
    if (!this.additionalConnections.length) return;

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
