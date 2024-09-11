import {
  getMetadataArgsSerializer,
  MetadataArgs,
} from '@metaplex-foundation/mpl-bubblegum';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { keccak_256 } from 'js-sha3';

export const BUBBLEGUM_PROGRAM_ID = new PublicKey(
  'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
);

export function computeMetadataArgsHash(metadata: MetadataArgs): Buffer {
  const serializedMetadata = getMetadataArgsSerializer().serialize(metadata);
  return Buffer.from(keccak_256.digest(serializedMetadata));
}

export const findBubblegumSignerPda = (
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('collection_cpi')],
    programId,
  );
};

export const findBubblegumTreeAuthorityPda = (
  merkleTree: PublicKey,
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync([merkleTree.toBytes()], programId);
};

export const findBubblegumMintAuthorityPda = (
  mint: PublicKey,
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync([mint.toBytes()], programId);
};

export function getLeafAssetId(
  tree: PublicKey,
  leafIndex: BN,
  programId: PublicKey = BUBBLEGUM_PROGRAM_ID,
): PublicKey {
  const [assetId] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('asset', 'utf8'),
      tree.toBuffer(),
      Uint8Array.from(leafIndex.toArray('le', 8)),
    ],
    programId,
  );
  return assetId;
}
