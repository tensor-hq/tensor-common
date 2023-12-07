import { PublicKey } from '@solana/web3.js';
import { TMETA_PROGRAM_ID } from './token_metadata';

export const AUTH_PROGRAM_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
);

export const findTokenRecordPda = (mint: PublicKey, token: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TMETA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('token_record'),
      token.toBuffer(),
    ],
    TMETA_PROGRAM_ID,
  );
};

export const findRuleSetPda = (payer: PublicKey, name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('rule_set'), payer.toBuffer(), Buffer.from(name)],
    AUTH_PROGRAM_ID,
  );
};
