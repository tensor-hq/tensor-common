import { Connection, PublicKey } from '@solana/web3.js';
import { deserializeUnchecked } from 'borsh';
import {
  BID_PREFIX,
  BidWithListing,
  LISTING_AUTH_PREFIX,
  LISTING_ITEM_PREFIX,
  MARKET_PROGRAM_ID,
  MARKET_SCHEMA,
  SaleListing,
  SaleListingBid,
  SUBSCRIPTION_PREFIX,
  SubscriptionType,
} from './state';
import { isNil } from 'lodash';

export const fetchListingAcc = async (
  connection: Connection,
  listingAccAddr: PublicKey,
): Promise<SaleListing> => {
  const data = await connection.getAccountInfo(listingAccAddr);
  if (!data) {
    throw new Error('listing acc missing');
  }

  return deserializeUnchecked(MARKET_SCHEMA, SaleListing, data.data);
};

export const fetchBidAcc = async (
  connection: Connection,
  bidAccAddr: PublicKey,
): Promise<BidWithListing> => {
  const data = await connection.getAccountInfo(bidAccAddr);
  if (!data) {
    throw new Error('bid acc missing');
  }
  const bidAcc: SaleListingBid = deserializeUnchecked(
    MARKET_SCHEMA,
    SaleListingBid,
    data.data,
  );
  const listingAcc = await fetchListingAcc(connection, bidAcc.listing);

  return { ...bidAcc, listingAcc, bidAccAddr };
};

export const findBidAcc = async (
  connection: Connection,
  type: 'latest' | 'new',
  listingAccAddr: PublicKey,
  buyerAccount: PublicKey,
  inclListing = false,
): Promise<{
  bidAccAddr: PublicKey;
  bidAccBump: number;
  bidAcc?: SaleListingBid;
  listingAcc?: SaleListing;
  bidId: number;
}> => {
  // There can be 255 offers per wallet. Loop findProgramAddress (0...255) if exist continue
  let bidAccAddr: PublicKey;
  let bidAccBump: number;
  let bidId = 0;

  let latestBidAccAddr: PublicKey;
  let latestBidAccBump: number;
  let latestBidAcc: SaleListingBid;
  let latestListingAcc: SaleListing | undefined = undefined;
  let latestBidId: number | undefined = undefined;

  for (bidId; bidId <= 255; bidId++) {
    const offerIdBytes = new Uint8Array(1);
    offerIdBytes[0] = bidId;

    [bidAccAddr, bidAccBump] = await findBidAccountPda(
      listingAccAddr,
      buyerAccount,
      bidId,
    );

    //if doesn't exist, break
    const saleListingOfferAccountInfo = await connection.getAccountInfo(
      bidAccAddr,
    );
    if (!saleListingOfferAccountInfo) {
      break;
    }

    //if no longer active, break
    const bidAcc = deserializeUnchecked(
      MARKET_SCHEMA,
      SaleListingBid,
      saleListingOfferAccountInfo.data,
    );

    //(!) this check has to be done OUTSIDE the fn
    // otherwise creating a bid after one has been cancelled will lead to "this account is already initialized"
    // if (bidAcc.state !== SaleListingBidState.Open) {
    //   break;
    // }

    latestBidAccAddr = bidAccAddr;
    latestBidAccBump = bidAccBump;
    latestBidAcc = bidAcc;
    latestBidId = bidId;
  }

  if (type === 'latest' && isNil(latestBidId)) {
    throw new Error('no active bid accs');
  }

  if (type === 'new') {
    return {
      bidAccAddr: bidAccAddr!,
      bidAccBump: bidAccBump!,
      bidId: bidId,
    };
  }

  if (inclListing) {
    const listingAccountInfo = await connection.getAccountInfo(
      latestBidAcc!.listing,
    );

    if (!!listingAccountInfo) {
      latestListingAcc = deserializeUnchecked(
        MARKET_SCHEMA,
        SaleListing,
        listingAccountInfo.data,
      );
    }
  }

  return {
    bidAccAddr: latestBidAccAddr!,
    bidAccBump: latestBidAccBump!,
    bidAcc: latestBidAcc!,
    bidId: latestBidId!,
    listingAcc: latestListingAcc,
  };
};

// --------------------------------------- pdas

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

export const findListingTokenAccountPda = async (
  listingAccAddr: PublicKey,
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(LISTING_ITEM_PREFIX), listingAccAddr.toBuffer()],
    MARKET_PROGRAM_ID,
  );
};

export const findListingAuthAccountPda = async (
  listingAccAddr: PublicKey,
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(LISTING_AUTH_PREFIX), listingAccAddr.toBuffer()],
    MARKET_PROGRAM_ID,
  );
};

export const findBidAccountPda = async (
  listingAccAddr: PublicKey,
  buyerWallet: PublicKey,
  bidId: number,
): Promise<[PublicKey, number]> => {
  const offerIdBytes = new Uint8Array(1);
  offerIdBytes[0] = bidId;

  return await PublicKey.findProgramAddress(
    [
      Buffer.from(BID_PREFIX),
      listingAccAddr.toBuffer(),
      buyerWallet.toBuffer(),
      offerIdBytes,
    ],
    MARKET_PROGRAM_ID,
  );
};
