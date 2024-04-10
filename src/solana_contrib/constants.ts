import { PublicKey } from '@solana/web3.js';

// greatly smaller bundle than using ComputeBudget.programId
export const COMPUTE_BUDGET_PROGRAM_ID = new PublicKey(
  'ComputeBudget111111111111111111111111111111',
);
