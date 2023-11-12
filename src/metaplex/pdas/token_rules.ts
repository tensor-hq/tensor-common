import { PublicKey } from '@solana/web3.js';
import { TOKEN_METADATA_PROGRAM_ID } from 'src/programs/auction_house/shared';

export const AUTH_PROG_ID = new PublicKey(
  'auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg',
);

const PREFIX = 'rule_set';

export const findTokenRecordPda = (mint: PublicKey, token: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('token_record'),
      token.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
};

export const findRuleSetPda = (payer: PublicKey, name: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PREFIX), payer.toBuffer(), Buffer.from(name)],
    AUTH_PROG_ID,
  );
};
