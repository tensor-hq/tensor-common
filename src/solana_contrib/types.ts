import { Transaction, VersionedTransaction } from '@solana/web3.js';

export type TxWithHeight = { tx: Transaction; lastValidBlockHeight: number };
export type TxV0WithHeight = {
  tx: VersionedTransaction;
  lastValidBlockHeight: number;
};
