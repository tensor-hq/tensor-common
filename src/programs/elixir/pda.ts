import { PublicKey } from '@solana/web3.js';
import { ELIXIR_PROGRAM_IDS } from './constants';

export const findVaultAccPda = (fnftMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), fnftMint.toBytes()],
    ELIXIR_PROGRAM_IDS.vault,
  );
};

export const findFeeAccPda = (poolMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('deposit'), poolMint.toBytes()],
    ELIXIR_PROGRAM_IDS.vault,
  );
};

export const findAppraisalAccPda = (
  poolMint: PublicKey,
  nftMint: PublicKey,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('appraisal'), poolMint.toBytes(), nftMint.toBytes()],
    ELIXIR_PROGRAM_IDS.vault,
  );
};

export const findExternalAccPda = (poolMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('fractions-seed'), poolMint.toBytes()],
    ELIXIR_PROGRAM_IDS.vault,
  );
};

export const findPoolAccPda = (poolMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('fractions'), poolMint.toBytes()],
    ELIXIR_PROGRAM_IDS.vault,
  );
};
