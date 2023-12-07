import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
export { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

export const TMETA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export const findMetadataPda = (
  mint: PublicKey,
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata', 'utf8'), programId.toBuffer(), mint.toBuffer()],
    programId,
  );
};

export const findMasterEditionPda = (
  mint: PublicKey,
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      programId.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition', 'utf8'),
    ],
    programId,
  );
};

export const findEditionPda = (
  mint: PublicKey,
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      programId.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition', 'utf8'),
    ],
    programId,
  );
};

export const findEditionMarkerPda = (
  mint: PublicKey,
  edition: BN,
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      programId.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition', 'utf8'),
      Buffer.from(edition.div(new BN(248)).toString()),
    ],
    programId,
  );
};

export const findCollectionAuthorityRecordPda = (
  mint: PublicKey,
  collectionAuthority: PublicKey,
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      programId.toBuffer(),
      mint.toBuffer(),
      Buffer.from('collection_authority', 'utf8'),
      collectionAuthority.toBuffer(),
    ],
    programId,
  );
};

export const findUseAuthorityRecordPda = (
  mint: PublicKey,
  useAuthority: PublicKey,
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      programId.toBuffer(),
      mint.toBuffer(),
      Buffer.from('user', 'utf8'),
      useAuthority.toBuffer(),
    ],
    programId,
  );
};

export const findProgramAsBurnerPda = (
  programId: PublicKey = TMETA_PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata', 'utf8'),
      programId.toBuffer(),
      Buffer.from('burn', 'utf8'),
    ],
    programId,
  );
};
