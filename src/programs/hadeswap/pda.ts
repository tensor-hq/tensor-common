import { PublicKey } from '@solana/web3.js';
import { utils } from '@project-serum/anchor';
import { HADESWAP_ADDR } from './constants';
import { hadeswap } from 'hadeswap-sdk';

export const findHSwapFeeVaultPda = (pair: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(utils.bytes.utf8.encode(hadeswap.constants.FEE_PREFIX)),
      pair.toBytes(),
    ],
    HADESWAP_ADDR,
  );
};
