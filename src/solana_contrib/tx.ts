import {
  ConfirmOptions,
  Connection,
  Context,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  Signer,
  Transaction,
  TransactionError,
  TransactionSignature,
} from '@solana/web3.js';
import assert from 'assert';
import bs58 from 'bs58';
import { logger } from '../logger';

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
      console.log(`Begin processing: ${this.txSig}`);
      console.log(`🚀 [${this.txSig.substr(0, 5)}] tx sent to MAIN connection`);
      this._sendToAdditionalConnections(rawTransaction);
    } catch (e) {
      console.error(e);
      throw e;
    }

    //asynchronously keep retrying until done or timeout
    (async () => {
      while (!this.done && this._getTimestamp() - startTime < this.timeout) {
        console.log(
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
              console.error(e);
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
      console.log('✅ Tx already confirmed');
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
      console.error(e);
      throw e;
    } finally {
      this._stopWaiting();
    }
  }

  private async _confirmTransaction(
    txSig: TransactionSignature,
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    console.log(`⏳ [${txSig.substr(0, 5)}] begin trying to confirm tx`);

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
          console.error(
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
      console.error(errMsg);
      throw new Error(errMsg);
    }

    if ((<RpcResponseAndContext<SignatureResult>>response).value.err) {
      console.error(
        `⚠️ [${txSig.substr(
          0,
          5,
        )}] confirmed AS FAILED TX in ${duration.toFixed(2)}sec`,
      );
    } else {
      console.log(
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
        console.warn(`[${txSig}] timeout waiting for sig`);
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
        console.error(
          // @ts-ignore
          `error sending tx to additional connection ${connection._rpcEndpoint}`,
        );
        console.error(e);
      });
    });
    console.log(
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

//(!) use this fn to create all txs, it ensures correct confirm opts are used
export const makeTx = async (
  connection: Connection,
  tx: Transaction,
  feePayer: PublicKey,
  additionalSigners?: Array<Signer>,
  opts = DEFAULT_CONFIRM_OPTS,
): Promise<Transaction> => {
  tx.feePayer = feePayer;
  tx.recentBlockhash = (
    await connection.getLatestBlockhash(opts.preflightCommitment)
  ).blockhash;

  if (additionalSigners) {
    additionalSigners
      .filter((s): s is Signer => s !== undefined)
      .forEach((kp) => {
        tx.partialSign(kp);
      });
  }

  return tx;
};

export const testFn1 = () => {
  console.log('i am test');
};

export const testFn2 = () => {
  console.log('i am test');
  logger.info('i am test from logger');
};
