import { Key, Metadata, fetchMetadata as fetchMetadataMplx } from '@metaplex-foundation/mpl-token-metadata';
import { Connection, PublicKey } from '@solana/web3.js';
import { findMetadataPda } from './pdas'; 
import { publicKey } from '@metaplex-foundation/umi';
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
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

/** Fetches Metadata account and handles zero'ed out accounts w/ Metaplex fee remaining */
export const fetchMetadata = async (
  conn: Connection,
  address: PublicKey,
): Promise<Metadata | null> => {
  try {
    const acct = await fetchMetadataMplx(createUmi(conn.rpcEndpoint), publicKey(address));
    if (!acct || acct.key === Key.Uninitialized) {
      return null;
    }
    return acct;
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
