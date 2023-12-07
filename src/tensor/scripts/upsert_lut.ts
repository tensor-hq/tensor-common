/** USAGE:
 *
 * KEYPAIR_FILE=<path to kp> LUT_MODE=(create|upsert) yarn ts-node --skipProject <script>
 *
 * */
import { Connection, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { createLUT, upsertLUT } from '../../solana_contrib';
import { TENSOR_LUT_ADDR, TENSOR_LUT_STORED_ADDRS } from '../lut';

(async () => {
  const conn = new Connection(
    'https://api.mainnet-beta.solana.com',
    'confirmed',
  );

  const kpFile = process.env.KEYPAIR_FILE;
  const lutMode = process.env.LUT_MODE;
  if (!kpFile) throw new Error('KEYPAIR_FILE env var not set');
  if (!lutMode) throw new Error('LUT_MODE env var not set');
  const kp = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(readFileSync(kpFile).toString())),
  );

  if (lutMode === 'create') {
    await createLUT({
      kp,
      conn,
      addresses: TENSOR_LUT_STORED_ADDRS,
    });
  } else if (lutMode === 'upsert') {
    console.log(`upserting LUT ${TENSOR_LUT_ADDR.toBase58()}`);
    await upsertLUT({
      kp,
      conn,
      lookupTableAddress: TENSOR_LUT_ADDR,
      addresses: TENSOR_LUT_STORED_ADDRS,
    });
  } else {
    throw new Error(`invalid LUT_MODE: ${lutMode}`);
  }
})();
