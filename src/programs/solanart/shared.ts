import { PublicKey } from '@solana/web3.js';

export const SOLANART_PROGRAM_ID = new PublicKey(
  'CJsLwbP1iu5DuUikHEJnLfANgKy6stB2uFgvBBHoyxwz',
);
export const BADGER_PROGRAM_ID = new PublicKey(
  '7gDpaG9kUXHTz1dj4eVfykqtXnKq2efyuGigdMeCy74B',
);
export const SOLANART_FEE_ACCT = new PublicKey(
  '39fEpihLATXPJCQuSiXLUSiCbGchGYjeL39eyXh3KbyT',
);
export const SOLANART_ESCROW_OWNER_ACCT = new PublicKey(
  '3D49QorJyNaL4rcpiynbuS3pRH4Y7EXEM6v6ZGaqfFGK',
);

export const findDataEscrowPda = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('sale'), mint.toBuffer()],
    SOLANART_PROGRAM_ID,
  );
};

export const findRoyaltiesPda = (mint: PublicKey, seller: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('fees'), mint.toBuffer(), seller.toBuffer()],
    SOLANART_PROGRAM_ID,
  );
};

export const findBadgerPda = (seller: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('nft'), seller.toBuffer()],
    BADGER_PROGRAM_ID,
  );
};
