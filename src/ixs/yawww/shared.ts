import {PublicKey} from "@solana/web3.js";
import {
  LISTING_AUTH_PREFIX,
  MARKET_PROGRAM_ID,
  SUBSCRIPTION_PREFIX,
  SubscriptionType
} from "./state";

export const createListingAuthorityAccountPda = async (
  listingAccAddr: PublicKey,
  authorityBump: number,
): Promise<PublicKey> => {
  return await PublicKey.createProgramAddress(
    [
      Buffer.from(LISTING_AUTH_PREFIX),
      listingAccAddr.toBuffer(),
      new Uint8Array([authorityBump]),
    ],
    MARKET_PROGRAM_ID,
  );
};

export const findSubscriptionAccountPda = async (
  wallet: PublicKey,
): Promise<[PublicKey, number]> => {
  const subscriptionTypeBytes = new Uint8Array(1);
  subscriptionTypeBytes[0] = SubscriptionType.Standard;

  return await PublicKey.findProgramAddress(
    [
      Buffer.from(SUBSCRIPTION_PREFIX),
      wallet.toBuffer(),
      subscriptionTypeBytes,
    ],
    MARKET_PROGRAM_ID,
  );
};