import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { getMint } from '@solana/spl-token';

export const AUCTION_HOUSE = 'auction_house';
export const AUCTION_HOUSE_PROGRAM_ID = new PublicKey(
  'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk',
);
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export const AUCTION_HOUSE_KEYS = {
  OpenSea: '3o9d13qUvEuuauhFrVom1vuCzgNsJifeaBYDPquaT73Y',
  Solanart: 'GWErq8nJf5JQtohg5k7RTkiZmoCxvGBJqbMSfkrxYFFy',
  CoralCube: '29xtkHHFLUHXiLoxTzbC7U8kekTwN3mVQSkfXnB1sQ6e',
  Fractal: 'BAmKB58MgkeYF2VueVBfASL5q8Qf6VKp4nA4cRuVUVft',
};

export const getQuantityWithMantissa = async (
  conn: Connection,
  quantity: BN | number,
  mint: PublicKey,
): Promise<BN> => {
  const mintInfo = await getMint(conn, new PublicKey(mint));
  const mantissa = new BN(10).pow(new BN(mintInfo.decimals));
  return mantissa.mul(new BN(quantity));
};
