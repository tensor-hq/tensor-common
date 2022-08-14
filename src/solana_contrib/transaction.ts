import {
  BlockhashWithExpiryBlockHeight,
  Commitment,
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
  TransactionSignature,
} from '@solana/web3.js';
import assert from 'assert';
import bs58 from 'bs58';
import { settleAllWithTimeout } from '../util';

const DEFAULT_CONFIRM_OPTS: ConfirmOptions = {
  commitment: 'confirmed',
  preflightCommitment: 'confirmed',
  skipPreflight: true,
};
const DEFAULT_TIMEOUT_MS = 60000;
const DEFAULT_RETRY_MS = 2000;

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

  async send(tx: Transaction): Promise<TransactionSignature> {
    const rawTransaction = tx.serialize();
    const startTime = this._getTimestamp();

    try {
      this.txSig = await this.connection.sendRawTransaction(
        rawTransaction,
        this.opts,
      );
      this.logger?.info(`Begin processing: ${this.txSig}`);
      this.logger?.info(
        `🚀 [${this.txSig.substr(0, 5)}] tx sent to MAIN connection`,
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
          `🔁 [${this.txSig?.substr(
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

  async tryConfirm(): Promise<ConfirmedTx> {
    if (this.confirmedTx) {
      this.logger?.info('✅ Tx already confirmed');
      return this.confirmedTx;
    }

    if (!this.txSig) {
      throw new Error('you need to send the tx first');
    }

    try {
      const result = await this._confirmTransaction(this.txSig);
      this.confirmedTx = {
        txSig: this.txSig,
        slot: result.context.slot,
        err: result.value,
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
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    this.logger?.info(`⏳ [${txSig.substr(0, 5)}] begin trying to confirm tx`);

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
      const confirmPromise = new Promise((resolve, reject) => {
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
            `[${txSig.substr(0, 5)}] error setting up onSig WS: ${err}`,
          );
          reject(err);
        }
      });
      subscriptionIds.push(subscriptionId);
      return confirmPromise;
    });

    try {
      await this._promiseTimeout(txSig, promises, this.timeout);
    } finally {
      for (const [i, subscriptionId] of subscriptionIds.entries()) {
        if (subscriptionId) {
          connections[i].removeSignatureListener(subscriptionId);
        }
      }
    }

    const duration = (Date.now() - this.start) / 1000;
    if (response === null) {
      const errMsg = `❌ [${txSig.substr(
        0,
        5,
      )}] NOT confirmed in ${duration.toFixed(2)}sec`;
      this.logger?.error(errMsg);
      throw new Error(errMsg);
    }

    if ((<RpcResponseAndContext<SignatureResult>>response).value.err) {
      this.logger?.warn(
        `⚠️ [${txSig.substr(
          0,
          5,
        )}] confirmed AS FAILED TX in ${duration.toFixed(2)}sec`,
      );
    } else {
      this.logger?.info(
        `✅ [${txSig.substr(0, 5)}] confirmed in ${duration.toFixed(2)}sec`,
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

  private _promiseTimeout<T>(
    txSig: TransactionSignature,
    promises: Promise<T>[],
    timeoutMs: number,
  ): Promise<T | null> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise: Promise<null> = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        this.logger?.warn(`[${txSig}] timeout waiting for sig`);
        resolve(null);
      }, timeoutMs);
    });

    return Promise.race([...promises, timeoutPromise]).then(
      (result: T | null) => {
        clearTimeout(timeoutId);
        return result;
      },
    );
  }

  private _sendToAdditionalConnections(rawTx: Buffer): void {
    this.additionalConnections.map((connection) => {
      connection.sendRawTransaction(rawTx, this.opts).catch((e) => {
        this.logger?.error(
          // @ts-ignore
          `error sending tx to additional connection ${connection._rpcEndpoint}: ${e}`,
        );
      });
    });
    this.logger?.info(
      `💥 [${this.txSig?.substr(0, 5)}] tx sent to ${
        this.additionalConnections.length
      } ADDITIONAL connections`,
    );
  }

  addAdditionalConnection(newConnection: Connection): void {
    const alreadyUsingConnection =
      this.additionalConnections.filter((connection) => {
        // @ts-ignore
        return connection._rpcEndpoint === newConnection.rpcEndpoint;
      }).length > 0;

    if (!alreadyUsingConnection) {
      this.additionalConnections.push(newConnection);
    }
  }
}

//(!) this should be the only function across our code used to build txs
// reason: we want to control how blockchash is constructed to minimize tx failures
export const buildTx = async ({
  connections,
  feePayer,
  instructions,
  additionalSigners,
  commitment = 'confirmed',
  blockhashRetries = 3,
  blockhashTimeoutMs = 2000,
}: {
  //(!) ideally this should be the same RPC node that will then try to send/confirm the tx
  connections: Array<Connection>;
  feePayer: PublicKey;
  instructions: TransactionInstruction[];
  additionalSigners?: Array<Signer>;
  commitment?: Commitment;
  blockhashRetries?: number;
  blockhashTimeoutMs?: number;
}): Promise<Transaction> => {
  const tx = new Transaction();

  if (!instructions.length) {
    throw new Error('must pass at least one instruction');
  }
  tx.add(...instructions);

  tx.feePayer = feePayer;

  let retries = 0;
  let blockhashes: RpcResponseAndContext<BlockhashWithExpiryBlockHeight>[] = [];

  while (blockhashes.length < 1 && retries < blockhashRetries) {
    //poll blockhashes from multiple providers, then take the one from RPC with latest slot
    //as per advice here https://jstarry.notion.site/Transaction-confirmation-d5b8f4e09b9c4a70a1f263f82307d7ce
    blockhashes = await settleAllWithTimeout(
      connections.map((c) => c.getLatestBlockhashAndContext(commitment)),
      blockhashTimeoutMs,
    );
    retries++;
  }

  if (!blockhashes.length) {
    throw new Error(
      `failed to fetch blockhash from ${connections.length} providers`,
    );
  }

  tx.recentBlockhash = blockhashes.sort(
    (a, b) => b.context.slot - a.context.slot,
  )[0].value.blockhash;

  if (additionalSigners) {
    additionalSigners
      .filter((s): s is Signer => s !== undefined)
      .forEach((kp) => {
        tx.partialSign(kp);
      });
  }

  return tx;
};
