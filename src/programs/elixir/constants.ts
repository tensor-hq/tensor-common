import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from '@solana/web3.js';

const FULFILLMENT_KEYS = {
  devnet: new PublicKey('BWjEMEtrW2BfdCrjkUcCZKCddQwM3SeiCFB9D1TTFFw6'),
  mainnet: new PublicKey('E6WNTMKecxpDvN4gNPE7zCeubXMSNoXgCnC8mEudXKXY'),
};
export const METADATA_PREFIX = 'metadata';

export const defaultVerifierAuthorityId = new PublicKey(
  'AcAJFFQLZ6zgpropNYU4cwnVjz2numBkPoMYWGYSeyFx',
);

const vaultProgramId = new PublicKey(
  '2qGyiNeWyZxNdkvWHc2jT5qkCnYa1j1gDLSSUmyoWMh8',
);

const augurProgramId = new PublicKey(
  'AUGUREpS2W6T5FgTiycU9oD7WFrbbf4mtvi6nwEkob5T',
);

const multiAssetPoolProgramId = new PublicKey(
  'CurZttATHFmd9vfeYvV9faBkXBeCrfEdXQp9n5j8kP6x',
);

const rentalProgramId = new PublicKey(
  'rentxNUvmi2jSsm41jkuNDSZbxFyJzgrE83XxvfSKYk',
);

const rentalsAuxilaryProgramId = new PublicKey(
  'rAUXwct9rF3cX8fb1n2sjgniiQ8dp9mBtNwTQ2kXKbc',
);

const lotteryProgramId = new PublicKey(
  '1otEfEhS4FQaJRwkv6saaw7iqM1nPegfaNpfFxge4Li',
);

const parliamentProgramId = new PublicKey(
  'houseKq5iHRX7hjyeFWk6dwALTUE6BG6RQptNSiJY6s',
);

const augurAuthorityId = new PublicKey(
  'AbZU2HupUBLkz9mUF2i6Q9UT1vjxULN9TdRK1uSQP67G',
);

const FEE_PID = new PublicKey('fee6uQpfQYhfZUxiYLvpAjuCGNE7NTJrCoXV8tsqsn6');

const DEX_PROGRAMS = {
  devnet: new PublicKey('DESVgJVGajEgKGXhb6XmqDHGz3VjdgP7rEVESBgxmroY'),
  mainnet: new PublicKey('9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin'),
};

const AMM_PROGRAMS = {
  devnet: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
  mainnet: new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
};

const WRAPPED_SOL_MINT = new PublicKey(
  'So11111111111111111111111111111111111111112',
);

const SWAP_PROGRAMS = {
  devnet: new PublicKey('ziR2PGyshLYwLsGsH5hXH5rkZTf6GNJ6RzvX23v52iY'),
  mainnet: new PublicKey('ziR2PGyshLYwLsGsH5hXH5rkZTf6GNJ6RzvX23v52iY'),
};

const TREASURY_ACCOUNTS = {
  devnet: new PublicKey('6kLLewcYCvUK6xLQE1ep36ReamuTLFuTWwhCnbMCb3pd'),
  mainnet: new PublicKey('6kLLewcYCvUK6xLQE1ep36ReamuTLFuTWwhCnbMCb3pd'),
};

const METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

const MEMO_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

const APPRAISER = new PublicKey('3RDTwtVmMcH9zvzqj8mZi9GH8apqWpRZyXB9DWL7QqrP');
const COMPOSE_PID = new PublicKey(
  'E1XRkj9fPF2NQUdoq41AHPqwMDHykYfn5PzBXAyDs7Be',
);
const PROGRAMS_LOOKUP_TABLE = new PublicKey(
  'FDU3PjpftvmM1g6d8ocF8dXzdYrB5zoCbs5Kv9PSJAgo',
);

export const SOL_SWITCHBOARD_KEYS = {
  devnet: new PublicKey('AdtRGGhmqvom3Jemp5YNrxd9q9unX36BZk1pujkkXijL'),
  mainnet: new PublicKey('AdtRGGhmqvom3Jemp5YNrxd9q9unX36BZk1pujkkXijL'),
};

export const BRIDGESPLIT_API = 'https://backend.bridgesplit.com';

export const ELIXIR_PROGRAM_IDS = {
  token: TOKEN_PROGRAM_ID,
  associatedToken: ASSOCIATED_TOKEN_PROGRAM_ID,
  system: SystemProgram.programId,
  rent: SYSVAR_RENT_PUBKEY,
  fulfillment: FULFILLMENT_KEYS.mainnet,
  vault: vaultProgramId,
  augur: augurProgramId,
  multi_asset: multiAssetPoolProgramId,
  augur_authority: augurAuthorityId,
  metadata: METADATA_PROGRAM_ID,
  treasury: TREASURY_ACCOUNTS.mainnet,
  dex: DEX_PROGRAMS.mainnet,
  amm: AMM_PROGRAMS.mainnet,
  sol_oracle: SOL_SWITCHBOARD_KEYS.mainnet,
  wrapped_sol: WRAPPED_SOL_MINT,
  sol: NATIVE_MINT.toString(),
  swap: SWAP_PROGRAMS.mainnet,
  memo: MEMO_ID,
  rental: rentalProgramId,
  rental_auxilary: rentalsAuxilaryProgramId,
  lottery: lotteryProgramId,
  parliament: parliamentProgramId,
  appraiser: APPRAISER,
  fee: FEE_PID,
  compose: COMPOSE_PID,
  lookups: PROGRAMS_LOOKUP_TABLE,
};
