import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';

export const findAta = (mint: PublicKey, owner: PublicKey): PublicKey => {
  return getAssociatedTokenAddressSync(mint, owner, true);
};

export const getOrCreateAtaForMint = async ({
  connection,
  mint,
  owner,
}: {
  connection: Connection;
  mint: PublicKey;
  owner: PublicKey;
}): Promise<{
  tokenAccount: PublicKey;
  instructions: TransactionInstruction[];
}> => {
  const instructions: TransactionInstruction[] = [];

  const tokenAccount = findAta(mint, owner);

  const accInfo = await connection.getAccountInfo(tokenAccount);

  //create if missing
  if (!accInfo) {
    instructions.push(
      createAssociatedTokenAccountInstruction(owner, tokenAccount, owner, mint),
    );
  }

  return {
    tokenAccount,
    instructions,
  };
};

// Returns the token account currently holding the NFT.
export const getNftTokenAcc = async (
  conn: Connection,
  mint: PublicKey,
): Promise<PublicKey | null> => {
  const nftTokenAcc = (await conn.getTokenLargestAccounts(mint)).value.find(
    (acc) => acc.uiAmount === 1,
  );
  if (!nftTokenAcc) return null;
  return new PublicKey(nftTokenAcc.address);
};
