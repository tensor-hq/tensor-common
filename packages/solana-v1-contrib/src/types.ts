import { Transaction, VersionedTransaction } from '@solana/web3.js';

export type TxWithHeight = {
  tx: Transaction;
  blockhash: string;
  lastValidBlockHeight: number;
};
export type TxV0WithHeight = {
  tx: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
};
