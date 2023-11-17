import { PublicKey } from '@solana/web3.js';
import { HADESWAP_ADDR, HADESWAP_FEE_PREFIX } from './constants';

export const findHSwapFeeVaultPda = (pair: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(HADESWAP_FEE_PREFIX), pair.toBytes()],
    HADESWAP_ADDR,
  );
};
