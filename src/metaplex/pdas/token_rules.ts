import { PublicKey } from '@solana/web3.js';
export { PROGRAM_ID as TMETA_PROG_ID } from '@metaplex-foundation/mpl-token-metadata';
import { PROGRAM_ID as TMETA_PROG_ID } from '@metaplex-foundation/mpl-token-metadata';

export const AUTH_PROG_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
);

const PREFIX = 'rule_set';

export const findTokenRecordPda = (mint: PublicKey, token: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TMETA_PROG_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('token_record'),
      token.toBuffer(),
    ],
    TMETA_PROG_ID,
  );
};

export const findRuleSetPda = (payer: PublicKey, name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PREFIX), payer.toBuffer(), Buffer.from(name)],
    AUTH_PROG_ID,
  );
};
