import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  getMint
} from "@solana/spl-token";
import {Connection, PublicKey, TransactionInstruction} from "@solana/web3.js";
import BN from "bn.js";

export const getQuantityWithMantissa = async (
  conn: Connection,
  quantity: BN | number,
  mint: PublicKey
): Promise<BN> => {
  const mintInfo = await getMint(conn, new PublicKey(mint));
  const mantissa = new BN(10).pow(new BN(mintInfo.decimals));
  return mantissa.mul(new BN(quantity));
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