import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Connection, PublicKey } from '@solana/web3.js';
import { findMetadataPda } from './pdas';

export const findMetadataFromMint = (mint: string | PublicKey) => {
  return findMetadataPda(new PublicKey(mint))[0];
};

export const fetchMetadataByMint = async (
  conn: Connection,
  mint: string | PublicKey,
) => {
  const address = findMetadataFromMint(mint);
  return {
    address,
    metadata: await fetchMetadata(conn, address),
  };
};

export enum MetadataErrType {
  Malformed = 'Malformed',
  Unknown = 'Unknown',
}

export const getMetadataErrType = (err: any) => {
  if (
    (err.code === 'ERR_ASSERTION' && err.message?.startsWith('Expected')) ||
    (err instanceof RangeError &&
      err.message?.includes('access memory outside buffer'))
  ) {
    return MetadataErrType.Malformed;
  }

  return MetadataErrType.Unknown;
};

/** Handles burned but non-empty metadata accounts */
export const deserializeMeta = (data: Uint8Array | Buffer): Metadata | null => {
  // NFT + metadata has been burned. The account may not be empty yet b/c 0.01 fee has not been collected yet.
  if (data[0] === 0) return null;
  return Metadata.deserialize(Buffer.from(data))[0];
};

/** Fetches Metadata account and handles zero'ed out accounts w/ Metaplex fee remaining */
export const fetchMetadata = async (
  conn: Connection,
  address: PublicKey,
): Promise<Metadata | null> => {
  try {
    const acct = await conn.getAccountInfo(address);
    if (!acct) {
      return null;
    }
    return deserializeMeta(acct.data);
  } catch (err: any) {
    const errType = getMetadataErrType(err);
    switch (errType) {
      case MetadataErrType.Malformed:
        console.warn(`metadata acct ${address} malformed, skipping: ${err}`);
        return null;
    }
    throw err;
  }
};
