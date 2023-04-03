import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { Connection, PublicKey } from '@solana/web3.js';
import { findMetadataPda } from './pdas';

export const fetchMetadataAcct = async (conn: Connection, mint: PublicKey) => {
  const [address] = findMetadataPda(mint);
  const account = await Metadata.fromAccountAddress(conn, address);
  return {
    address,
    account,
    creators: account.data.creators,
  };
};
