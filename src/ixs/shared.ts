import { getMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
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
