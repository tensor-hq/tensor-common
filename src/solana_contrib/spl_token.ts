import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';

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

  const tokenAccount = await getAssociatedTokenAddress(mint, owner);

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
