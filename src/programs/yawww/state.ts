import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { BinaryReader, BinaryWriter } from 'borsh';
import base58 from 'bs58';

const extendBorsh = () => {
  (BinaryReader.prototype as any).readPubkey = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return new PublicKey(array);
  };

  (BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(value.toBuffer());
  };

  (BinaryReader.prototype as any).readPubkeyAsString = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return base58.encode(array) as string;
  };

  (BinaryWriter.prototype as any).writePubkeyAsString = function (
    value: string,
  ) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(base58.decode(value));
  };
};

export const LISTING_AUTH_PREFIX = 'listing-authority';
export const LISTING_ITEM_PREFIX = 'listing-item';
export const BID_PREFIX = 'listing-bid';
export const BID_PRICE_PREFIX = 'bid-price';
export const SUBSCRIPTION_PREFIX = 'subscription';
export const MAX_ITEM_LISTING_ACCOUNT_SIZE = 216;
export const MAX_ITEM_LISTING_BID_ACCOUNT_SIZE = 141;

export const MARKET_PROGRAM_ID = new PublicKey(
  '5SKmrbAxnHV2sgqyDXkGrLrokZYtWWVEEk5Soed7VLVN',
);
export const MARKET_FEES_WALLET = new PublicKey(
  'Fz7HjwoXiDZNRxXMfLAAJLbArqjCTVWrG4wekit2VpSd',
);

// --------------------------------------- listing state

export enum MarketInstructionNumber {
  ListItem = 0,
  CancelListing = 1,
  BuyListing = 2,
  BidOnListing = 3,
  CancelBid = 4,
  AcceptBid = 5,
  UpdateListing = 10,
}

export enum MarketStructureType {
  Uninitialized, // 0
  ListingV1, // 1
  ListingBidV1, // 2
}

export enum SaleListingState {
  Open, // Open listing, can be canceled or someone can buy it
  Canceled, // Canceled listing. Final state
  Sold, // SaleListing which has been sold to someone. Final state
}

export interface ListingArgs {
  type_key: MarketStructureType; // u8
  owner: PublicKey; // Pubkey
  state: SaleListingState; // u8
  buyer?: PublicKey; // Pubkey
  item_mint: PublicKey; // Pubkey
  item_amount: BN; // u64
  item_token_account: PublicKey; // Pubkey
  optional_wallet?: PublicKey; // Pubkey

  price: BN; // u64,
  price_mint?: PublicKey; // Pubkey
  creator_share: number; // u8,
  optional_share: number; // u8,
  authority_bump: number; // u8,
}

export class SaleListing {
  type_key: MarketStructureType; // u8
  owner: PublicKey; // Pubkey
  state: SaleListingState; // u8
  buyer?: PublicKey; // Pubkey
  item_mint: PublicKey; // Pubkey
  item_amount: BN; // u64
  item_token_account: PublicKey; // Pubkey
  optional_wallet?: PublicKey; // Optional Pubkey

  // Price in base units
  price: BN; // u64,
  // Optional - if there is no price mint, price will be in lamports. Allows paying in other tokens, like USDC
  price_mint?: PublicKey; // Optional Pubkey
  // Portion of price given to creators, in percent
  creator_share: number; // u8,
  // Portion of price given to collection's optional, in percent
  optional_share: number; // u8,
  authority_bump: number; // u8,

  constructor(args: ListingArgs) {
    this.type_key = args.type_key;
    this.owner = args.owner;
    this.state = args.state;
    this.buyer = args.buyer;
    this.item_mint = args.item_mint;
    this.item_amount = args.item_amount;
    this.item_token_account = args.item_token_account;
    this.optional_wallet = args.optional_wallet;

    this.price = args.price;
    this.price_mint = args.price_mint;
    this.creator_share = args.creator_share;
    this.optional_share = args.optional_share;
    this.authority_bump = args.authority_bump;
  }
}

export class BuyListingInstructionData {
  instruction = MarketInstructionNumber.BuyListing;
  price_expected: BN; // u64 - price visible to user, if listing is updated this value is used for the check

  constructor(args: { price_expected: BN }) {
    this.price_expected = args.price_expected; // price visible to user, if listing is updated this value is used for the check
  }
}

export class InitListingInstructionData {
  instruction = MarketInstructionNumber.ListItem;
  amount: BN; // u64
  price: BN; // u64
  creator_share: number; // u8
  optional_share: number; // u8
  optional_wallet?: PublicKey; // Option<Pubkey>,
  authority_bump: number; // u8
  escrow_token_account_bump: number; // u8

  constructor(args: {
    amount: BN;
    price: BN;
    creator_share: number;
    optional_share: number;
    optional_wallet?: PublicKey;
    authority_bump: number;
    escrow_token_account_bump: number;
  }) {
    this.amount = args.amount;
    this.price = args.price;
    this.creator_share = args.creator_share;
    this.optional_share = args.optional_share;
    this.optional_wallet = args.optional_wallet;
    this.authority_bump = args.authority_bump;
    this.escrow_token_account_bump = args.escrow_token_account_bump;
  }
}

// --------------------------------------- bid state

export enum SaleListingBidState {
  Open, // Open bid, can be canceled or someone can accept it
  Canceled, // Canceled bid. Final state
  Accepted, // SaleListing which has been sold to someone. Final state
}

export interface SaleListingBidArgs {
  type_key: MarketStructureType;
  listing: PublicKey; //Pubkey
  bidder: PublicKey; //Pubkey
  state: SaleListingBidState;
  listing_owner: PublicKey; //Pubkey
  id: number; // u8,
  bid_price: BN; //u64,
  // Must equal the price mint of listing
  bid_token_account?: PublicKey; // Option<Pubkey>,
  bump: number; // u8,
}

export class SaleListingBid {
  type_key: MarketStructureType;
  listing: PublicKey; //Pubkey
  bidder: PublicKey; //Pubkey
  state: SaleListingBidState; //u8
  listing_owner: PublicKey; //Pubkey
  id: number; // u8,
  bid_price: BN; //u64,
  // Must equal the price mint of listing
  bid_token_account?: PublicKey; // Option<Pubkey>,
  bump: number; // u8,

  constructor(args: SaleListingBidArgs) {
    this.type_key = args.type_key;
    this.listing = args.listing;
    this.bidder = args.bidder;
    this.state = args.state;
    this.listing_owner = args.listing_owner;
    this.id = args.id;
    this.bid_price = args.bid_price;
    this.bid_token_account = args.bid_token_account;
    this.bump = args.bump;
  }
}

export type BidWithListing = SaleListingBid & {
  listingAcc: SaleListing;
  bidAccAddr: PublicKey;
};

export class BidOnListingInstructionData {
  instruction = MarketInstructionNumber.BidOnListing;
  price: BN; // u64
  bid_bump: number; // u8
  bid_escrow_bump: number; // u8
  bid_id: number; // u8,

  constructor(args: {
    price: BN;
    bid_bump: number;
    bid_escrow_bump: number;
    bid_id: number;
  }) {
    this.price = args.price;
    this.bid_bump = args.bid_bump;
    this.bid_escrow_bump = args.bid_escrow_bump;
    this.bid_id = args.bid_id;
  }
}

export class UpdateListingInstructionData {
  instruction = MarketInstructionNumber.UpdateListing;
  price?: BN; // u64
  creator_share?: number; // u8
  optional_share?: number; // u8 - aka charity_share

  constructor(args: {
    price?: BN;
    creator_share?: number;
    optional_share?: number;
  }) {
    this.price = args.price;
    this.creator_share = args.creator_share;
    this.optional_share = args.optional_share;
  }
}

// --------------------------------------- subscription state

export enum SubscriptionType {
  Standard, // Standard subscription that can be used to reduce marketplace fees and see loans earlier
}

export enum SubscriptionTier {
  Basic,
  Standard,
  Premium,
}

export enum SubscriptionStructureType {
  Uninitialized, // 0
  ListingV1, // 1
  ListingBidV1, // 2
  SubscriptionV1, // 3
}

export interface SubscriptionArgs {
  type_key: SubscriptionStructureType;
  owner: PublicKey; // Pubkey
  subscription_type: SubscriptionType; // u8
  tier: SubscriptionTier; // u8

  expires_at?: BN; // Option<u64>,
  times_left?: BN; // Option<u64>,
  bump: number; // u8,
}

export class Subscription {
  type_key: SubscriptionStructureType;
  owner: PublicKey; // Pubkey
  subscription_type: SubscriptionType; // u8
  tier: SubscriptionTier; // u8

  expires_at?: BN; // Option<u64>,
  times_left?: BN; // Option<u64>,
  bump: number; // u8,

  constructor(args: SubscriptionArgs) {
    this.type_key = args.type_key;
    this.owner = args.owner;
    this.subscription_type = args.subscription_type;
    this.tier = args.tier;
    this.expires_at = args.expires_at;
    this.times_left = args.times_left;
    this.bump = args.bump;
  }
}

export class InstructionData {
  instruction: number;

  constructor(args: { instruction: number }) {
    this.instruction = args.instruction;
  }
}

// --------------------------------------- schema

// Borsh does not natively support 'pubkey' type mapping
// We need to extend it
extendBorsh();

export const MARKET_SCHEMA = new Map<any, any>([
  [
    SaleListing,
    {
      kind: 'struct',
      fields: [
        ['type_key', 'u8'],
        ['owner', 'pubkey'],
        ['state', 'u8'],
        ['buyer', { kind: 'option', type: 'pubkey' }], // Option<Pubkey>,
        ['item_mint', 'pubkey'],
        ['item_amount', 'u64'],
        ['item_token_account', 'pubkey'],
        ['optional_wallet', { kind: 'option', type: 'pubkey' }], // Option<Pubkey>,
        ['price', 'u64'],
        ['price_mint', { kind: 'option', type: 'pubkey' }], // Option<Pubkey>,
        ['creator_share', 'u8'],
        ['optional_share', 'u8'],
        ['authority_bump', 'u8'],
      ],
    },
  ],
  [
    SaleListingBid,
    {
      kind: 'struct',
      fields: [
        ['type_key', 'u8'],
        ['listing', 'pubkey'],
        ['bidder', 'pubkey'],
        ['state', 'u8'],
        ['listing_owner', 'pubkey'],
        ['id', 'u8'],
        ['bid_price', 'u64'],
        ['bid_token_account', { kind: 'option', type: 'pubkey' }], // Option<Pubkey>,
        ['bump', 'u8'],
      ],
    },
  ],
  [
    InitListingInstructionData,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['amount', 'u64'],
        ['price', 'u64'],
        ['creator_share', 'u8'],
        ['optional_share', 'u8'],
        ['optional_wallet', { kind: 'option', type: 'pubkey' }], // Option<Pubkey>,
        ['authority_bump', 'u8'],
        ['escrow_token_account_bump', 'u8'],
      ],
    },
  ],

  [
    BuyListingInstructionData,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['price_expected', 'u64'],
      ],
    },
  ],
  [
    UpdateListingInstructionData,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['price', { kind: 'option', type: 'u64' }], // Option<u64>,
        ['creator_share', { kind: 'option', type: 'u8' }], // Option<u8>,
        ['optional_share', { kind: 'option', type: 'u8' }], // Option<u8>,
      ],
    },
  ],
  [
    BidOnListingInstructionData,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['price', 'u64'],
        ['bid_bump', 'u8'],
        ['bid_escrow_bump', 'u8'],
        ['bid_id', 'u8'],
      ],
    },
  ],
  [
    InstructionData,
    {
      kind: 'struct',
      fields: [['instruction', 'u8']],
    },
  ],
  [
    Subscription,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['owner', 'pubkey'],
        ['subscription_type', 'u8'],
        ['tier', 'u8'],
        ['expires_at', { kind: 'option', type: 'u64' }],
        ['times_left', { kind: 'option', type: 'u64' }],
        ['bump', 'u8'],
      ],
    },
  ],
]);

// --------------------------------------- errors

export enum MarketProgramError {
  'Invalid Instruction' = 10001,
  'Not Rent Exempt' = 10002,
  'Expected Amount Mismatch' = 10003,
  'Amount Overflow' = 10004,
  'Invalid input accounts' = 10005,
  'TokenDestinationShouldBeEmpty' = 10006,
  'InvalidTokenProgram' = 10007,
  'Account already initialized' = 10008,
  'User does not have enough funds' = 10009,
  'Data type mismatch' = 10010,
  'Unsupported token type for price' = 10011,
  'Missing creator' = 10012,
  'SaleListing closed' = 10013,
  'Empty NFT stake account given' = 10014,
  'Same NFT stake account given' = 10015,
  'Invalid admin wallet' = 10016,
  'Already have longer/better subscription active' = 10017,
  'Bid closed' = 10018,
  'Invalid bid funding amount' = 10019,
  'Price does not equal expected price.' = 10020,
  'Abnormal creator fees' = 10021,
}

export interface SaleListingInfo {
  saleListingAccount: PublicKey;
  listing: SaleListing;
}
