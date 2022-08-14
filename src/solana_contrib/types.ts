import { Transaction } from '@solana/web3.js';

export type TxWithHeight = { tx: Transaction; lastValidBlockHeight: number };
