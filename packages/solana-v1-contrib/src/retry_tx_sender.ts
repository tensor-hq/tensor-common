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
import { waitMS } from '@tensor-hq/ts-utils';
import assert from 'assert';
import bs58 from 'bs58';
import { backOff } from 'exponential-backoff';
import { getLatestBlockHeight } from './rpc';

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
  private start?: number;
  private txSig?: TransactionSignature;
  private confirmedTx?: ConfirmedTx;
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

        if (opts?.disableWs) return [pollPromise];

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
