/** USAGE:
 *
 * KEYPAIR_FILE=<path to kp> LUT_MODE=(create|upsert) CLUSTER=(mainnet-beta|devnet) yarn ts-node --skipProject <script>
 *
 * */
import { Cluster, Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { createLUT, upsertLUT } from '../../solana_contrib';
import { TENSOR_LUT_STORED_ADDRS } from '../lut';
import { TENSOR_LUT_ADDR, TENSOR_LUT_DEVNET_ADDR } from '../constants';

(async () => {
  // lut authority and payer
  const kpFile = process.env.KEYPAIR_FILE;
  const lutMode = process.env.LUT_MODE;
  const cluster = process.env.CLUSTER; // LUT varies between mainnet and devnet
  if (!kpFile) throw new Error('KEYPAIR_FILE env var not set');
  if (!lutMode) throw new Error('LUT_MODE env var not set');
  if (!cluster) throw new Error('CLUSTER env var not set');
  if (cluster !== 'devnet' && cluster !== 'mainnet-beta')
    throw new Error('CLUSTER env var invalid');

  const lookupTableAddress =
    cluster === 'mainnet-beta' ? TENSOR_LUT_ADDR : TENSOR_LUT_DEVNET_ADDR;
  const conn = new Connection(clusterApiUrl(cluster as Cluster), 'confirmed');
  const payer = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(readFileSync(kpFile).toString())),
  );

  if (lutMode === 'create') {
    await createLUT({
      payer,
      conn,
      addresses: TENSOR_LUT_STORED_ADDRS,
    });
  } else if (lutMode === 'upsert') {
    console.log(`upserting LUT ${lookupTableAddress.toBase58()}`);
    await upsertLUT({
      payer,
      conn,
      lookupTableAddress,
      addresses: TENSOR_LUT_STORED_ADDRS,
    });
  } else {
    throw new Error(`invalid LUT_MODE: ${lutMode}`);
  }
})();
