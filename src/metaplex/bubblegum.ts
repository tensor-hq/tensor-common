import {
  MetadataArgs,
  metadataArgsBeet,
} from '@metaplex-foundation/mpl-bubblegum';
import { keccak_256 } from 'js-sha3';

/** Version from metaplex but without seller fee basis points */
export function computeMetadataArgsHash(metadata: MetadataArgs): Buffer {
  const [serializedMetadata] = metadataArgsBeet.serialize(metadata);
  return Buffer.from(keccak_256.digest(serializedMetadata));
}
