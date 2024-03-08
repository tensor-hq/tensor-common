import BN from 'bn.js';
import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Creator, UseMethod } from '@metaplex-foundation/mpl-token-metadata';
import type { MetadataArgs } from '@metaplex-foundation/mpl-bubblegum';
import { Attribute, PnftArgs } from '..';

// TODO: imported from tcomp-ts, since we dont have it in tensor-common

enum Field {
  Name = 'Name',
}

enum Target {
  AssetId = 'AssetId',
  Whitelist = 'Whitelist',
}

// --------------------------------------- ixs

type SerializedInstruction = {
  programId: string;
  keys: Array<{
    pubkey: string;
    isSigner: boolean;
    isWritable: boolean;
  }>;
  data: number[];
};

function serializeInstruction(instruction: TransactionInstruction) {
  return {
    programId: instruction.programId.toString(),
    keys: instruction.keys.map((keyObj) => ({
      pubkey: keyObj.pubkey.toString(),
      isSigner: keyObj.isSigner,
      isWritable: keyObj.isWritable,
    })),
    data: Array.from(instruction.data),
  };
}

function deserializeInstruction(serialized: SerializedInstruction) {
  return {
    programId: new PublicKey(serialized.programId),
    keys: serialized.keys.map((keyObj) => ({
      pubkey: new PublicKey(keyObj.pubkey),
      isSigner: keyObj.isSigner,
      isWritable: keyObj.isWritable,
    })),
    data: Buffer.from(serialized.data),
  };
}

// --------------------------------------- metadata

export type CreatorSerialized = {
  address: string;
  verified: boolean;
  share: number;
};

export type CollectionSerialized = {
  key: string;
  verified: boolean;
};

export type UsesSerialized = {
  useMethod: UseMethod;
  remaining: string;
  total: string;
};

export type MetadataArgsSerialized = Omit<
  MetadataArgs,
  'collection' | 'creators' | 'uses'
> & {
  collection: CollectionSerialized | null;
  creators: CreatorSerialized[];
  uses: UsesSerialized | null;
};

function serializeMetadataArgs(args: MetadataArgs): MetadataArgsSerialized {
  return {
    name: args.name,
    symbol: args.symbol,
    uri: args.uri,
    sellerFeeBasisPoints: args.sellerFeeBasisPoints,
    primarySaleHappened: args.primarySaleHappened,
    isMutable: args.isMutable,
    editionNonce: args.editionNonce,
    tokenStandard: args.tokenStandard,
    tokenProgramVersion: args.tokenProgramVersion,
    collection: args.collection
      ? {
          key: args.collection.key.toString(),
          verified: args.collection.verified,
        }
      : null,
    creators: args.creators.map((creator) => ({
      address: creator.address.toString(),
      verified: creator.verified,
      share: creator.share,
    })),
    uses: args.uses
      ? {
          useMethod: args.uses.useMethod,
          remaining: args.uses.remaining.toString(),
          total: args.uses.total.toString(),
        }
      : null,
  };
}

function deserializeMetadataArgs(
  serialized: MetadataArgsSerialized,
): MetadataArgs {
  return {
    name: serialized.name,
    symbol: serialized.symbol,
    uri: serialized.uri,
    sellerFeeBasisPoints: serialized.sellerFeeBasisPoints,
    primarySaleHappened: serialized.primarySaleHappened,
    isMutable: serialized.isMutable,
    editionNonce: serialized.editionNonce,
    tokenStandard: serialized.tokenStandard,
    tokenProgramVersion: serialized.tokenProgramVersion,
    collection: serialized.collection
      ? {
          key: new PublicKey(serialized.collection.key),
          verified: serialized.collection.verified,
        }
      : null,
    creators: serialized.creators.map((creator) => ({
      address: new PublicKey(creator.address),
      verified: creator.verified,
      share: creator.share,
    })),
    uses: serialized.uses
      ? {
          useMethod: serialized.uses.useMethod,
          remaining: new BN(serialized.uses.remaining),
          total: new BN(serialized.uses.total),
        }
      : null,
  };
}

// --------------------------------------- compressed args

export type TakeCompressedArgs = {
  targetData:
    | {
        target: 'assetIdOrFvcWithoutField';
        data: {
          metaHash: Buffer;
          creators: Creator[];
          sellerFeeBasisPoints: number;
        };
      }
    | { target: 'rest'; data: { metadata: MetadataArgs } };
  bidId: PublicKey;
  merkleTree: PublicKey;
  proof: Buffer[];
  root: number[];
  /** in most cases nonce == index and doesn't need to passed in separately */
  nonce?: BN;
  index: number;
  minAmount: BN;
  currency?: PublicKey | null;
  makerBroker: PublicKey | null;
  optionalRoyaltyPct?: number | null;
  owner: PublicKey;
  seller: PublicKey;
  delegate?: PublicKey;
  margin?: PublicKey | null;
  takerBroker?: PublicKey | null;
  rentDest: PublicKey;
  compute?: number | null;
  priorityMicroLamports?: number | null;
  canopyDepth?: number;
  whitelist?: PublicKey | null;
  delegateSigner?: boolean;
  cosigner?: PublicKey | null;
  blockhash?: string;
  /** in case fetch times out (eg IPFS no longer hosted), fallback to this */
  traits: Attribute[];
};

export type TakeCompressedArgsSerialized = {
  targetData:
    | {
        target: 'assetIdOrFvcWithoutField';
        data: {
          metaHash: number[];
          creators: CreatorSerialized[];
          sellerFeeBasisPoints: number;
        };
      }
    | { target: 'rest'; data: { metadata: MetadataArgsSerialized } };
  bidId: string;
  merkleTree: string;
  proof: number[][];
  root: number[];
  //in most cases nonce == index and doesn't need to passed in separately
  nonce?: string;
  index: number;
  minAmount: string;
  currency?: string | null;
  makerBroker: string | null;
  optionalRoyaltyPct?: number | null;
  owner: string;
  seller: string;
  delegate?: string;
  margin?: string | null;
  takerBroker?: string | null;
  rentDest: string;
  compute?: number | null;
  priorityMicroLamports?: number | null;
  canopyDepth?: number;
  whitelist?: string | null;
  delegateSigner?: boolean;
  cosigner?: string | null;
  blockhash?: string;
  traits: Attribute[];
};

export function serializeTakeCompressedArgs(
  args: TakeCompressedArgs,
): TakeCompressedArgsSerialized {
  return {
    targetData:
      args.targetData.target === 'assetIdOrFvcWithoutField'
        ? {
            target: args.targetData.target,
            data: {
              metaHash: [...args.targetData.data.metaHash],
              creators: args.targetData.data.creators.map((creator) => ({
                address: creator.address.toString(),
                verified: creator.verified,
                share: creator.share,
              })),
              sellerFeeBasisPoints: args.targetData.data.sellerFeeBasisPoints,
            },
          }
        : {
            target: args.targetData.target,
            data: {
              metadata: serializeMetadataArgs(args.targetData.data.metadata),
            },
          },
    bidId: args.bidId.toString(),
    merkleTree: args.merkleTree.toString(),
    proof: args.proof.map((p) => [...p]),
    root: args.root,
    nonce: args.nonce ? args.nonce.toString() : undefined,
    index: args.index,
    minAmount: args.minAmount.toString(),
    currency: args.currency ? args.currency.toString() : null,
    makerBroker: args.makerBroker ? args.makerBroker.toString() : null,
    optionalRoyaltyPct: args.optionalRoyaltyPct,
    owner: args.owner.toString(),
    seller: args.seller.toString(),
    delegate: args.delegate ? args.delegate.toString() : undefined,
    margin: args.margin ? args.margin.toString() : null,
    takerBroker: args.takerBroker ? args.takerBroker.toString() : null,
    rentDest: args.rentDest.toString(),
    compute: args.compute,
    priorityMicroLamports: args.priorityMicroLamports,
    canopyDepth: args.canopyDepth,
    whitelist: args.whitelist ? args.whitelist.toString() : null,
    delegateSigner: args.delegateSigner,
    cosigner: args.cosigner ? args.cosigner.toString() : null,
    blockhash: args.blockhash,
    traits: args.traits,
  };
}

export function deserializeTakeCompressedArgs(
  serialized: TakeCompressedArgsSerialized,
): TakeCompressedArgs {
  return {
    targetData:
      serialized.targetData.target === 'assetIdOrFvcWithoutField'
        ? {
            target: serialized.targetData.target,
            data: {
              metaHash: Buffer.from(serialized.targetData.data.metaHash),
              creators: serialized.targetData.data.creators.map((creator) => ({
                address: new PublicKey(creator.address),
                verified: creator.verified,
                share: creator.share,
              })),
              sellerFeeBasisPoints:
                serialized.targetData.data.sellerFeeBasisPoints,
            },
          }
        : {
            target: serialized.targetData.target,
            data: {
              metadata: deserializeMetadataArgs(
                serialized.targetData.data.metadata,
              ),
            },
          },
    bidId: new PublicKey(serialized.bidId),
    merkleTree: new PublicKey(serialized.merkleTree),
    proof: serialized.proof.map((p) => Buffer.from(p)),
    root: serialized.root,
    nonce: serialized.nonce ? new BN(serialized.nonce) : undefined,
    index: serialized.index,
    minAmount: new BN(serialized.minAmount),
    currency: serialized.currency ? new PublicKey(serialized.currency) : null,
    makerBroker: serialized.makerBroker
      ? new PublicKey(serialized.makerBroker)
      : null,
    optionalRoyaltyPct: serialized.optionalRoyaltyPct,
    owner: new PublicKey(serialized.owner),
    seller: new PublicKey(serialized.seller),
    delegate: serialized.delegate
      ? new PublicKey(serialized.delegate)
      : undefined,
    margin: serialized.margin ? new PublicKey(serialized.margin) : null,
    takerBroker: serialized.takerBroker
      ? new PublicKey(serialized.takerBroker)
      : null,
    rentDest: new PublicKey(serialized.rentDest),
    compute: serialized.compute,
    priorityMicroLamports: serialized.priorityMicroLamports,
    canopyDepth: serialized.canopyDepth,
    whitelist: serialized.whitelist
      ? new PublicKey(serialized.whitelist)
      : null,
    delegateSigner: serialized.delegateSigner,
    cosigner: serialized.cosigner ? new PublicKey(serialized.cosigner) : null,
    blockhash: serialized.blockhash,
    traits: serialized.traits,
  };
}

// --------------------------------------- legacy args

export type TakeLegacyArgs = {
  bidId: PublicKey;
  nftMint: PublicKey;
  nftSellerAcc: PublicKey;
  owner: PublicKey;
  seller: PublicKey;
  minAmount: BN;
  currency?: PublicKey | null;
  makerBroker: PublicKey | null;
  optionalRoyaltyPct?: number | null;
  margin?: PublicKey | null;
  takerBroker?: PublicKey | null;
  rentDest: PublicKey;
  whitelist?: PublicKey | null;
  cosigner?: PublicKey | null;
  blockhash?: string;
  /** in case fetch times out (eg IPFS no longer hosted), fallback to this */
  traits: Attribute[];
} & PnftArgs;

export type PnftArgsSerialized = {
  authData?: any | null; //TODO:
  /** passing in null or undefined means these ixs are NOT included */
  compute?: number | null;
  /** If a ruleSet is present, we add this many additional */
  ruleSetAddnCompute?: number | null;
  priorityMicroLamports?: number | null;
};

export type TakeLegacyArgsSerialized = {
  bidId: string;
  nftMint: string;
  nftSellerAcc: string;
  owner: string;
  seller: string;
  minAmount: string;
  currency?: string | null;
  makerBroker: string | null;
  optionalRoyaltyPct?: number | null;
  margin?: string | null;
  takerBroker?: string | null;
  rentDest: string;
  whitelist?: string | null;
  cosigner?: string | null;
  blockhash?: string;
  traits: Attribute[];
} & PnftArgsSerialized;

export function serializeTakeLegacyArgs(
  args: TakeLegacyArgs,
): TakeLegacyArgsSerialized {
  return {
    bidId: args.bidId.toString(),
    nftMint: args.nftMint.toString(),
    nftSellerAcc: args.nftSellerAcc.toString(),
    owner: args.owner.toString(),
    seller: args.seller.toString(),
    minAmount: args.minAmount.toString(),
    currency: args.currency ? args.currency.toString() : null,
    makerBroker: args.makerBroker ? args.makerBroker.toString() : null,
    optionalRoyaltyPct: args.optionalRoyaltyPct,
    margin: args.margin ? args.margin.toString() : null,
    takerBroker: args.takerBroker ? args.takerBroker.toString() : null,
    rentDest: args.rentDest.toString(),
    whitelist: args.whitelist ? args.whitelist.toString() : null,
    cosigner: args.cosigner ? args.cosigner.toString() : null,
    authData: args.authData, // Assuming no transformation needed for AuthorizationData type
    compute: args.compute,
    ruleSetAddnCompute: args.ruleSetAddnCompute,
    priorityMicroLamports: args.priorityMicroLamports,
    blockhash: args.blockhash,
    traits: args.traits,
  };
}

export function deserializeTakeLegacyArgs(
  serialized: TakeLegacyArgsSerialized,
): TakeLegacyArgs {
  return {
    bidId: new PublicKey(serialized.bidId),
    nftMint: new PublicKey(serialized.nftMint),
    nftSellerAcc: new PublicKey(serialized.nftSellerAcc),
    owner: new PublicKey(serialized.owner),
    seller: new PublicKey(serialized.seller),
    minAmount: new BN(serialized.minAmount),
    currency: serialized.currency ? new PublicKey(serialized.currency) : null,
    makerBroker: serialized.makerBroker
      ? new PublicKey(serialized.makerBroker)
      : null,
    optionalRoyaltyPct: serialized.optionalRoyaltyPct,
    margin: serialized.margin ? new PublicKey(serialized.margin) : null,
    takerBroker: serialized.takerBroker
      ? new PublicKey(serialized.takerBroker)
      : null,
    rentDest: new PublicKey(serialized.rentDest),
    whitelist: serialized.whitelist
      ? new PublicKey(serialized.whitelist)
      : null,
    cosigner: serialized.cosigner ? new PublicKey(serialized.cosigner) : null,
    // PnftArgs fields:
    authData: serialized.authData, // Assuming no transformation needed for AuthorizationData type
    compute: serialized.compute,
    ruleSetAddnCompute: serialized.ruleSetAddnCompute,
    priorityMicroLamports: serialized.priorityMicroLamports,
    blockhash: serialized.blockhash,
    traits: serialized.traits,
  };
}

// --------------------------------------- bid args

export type PlaceBidArgs = {
  traits: Attribute[];
  otherIxs: TransactionInstruction[];
  target: Target;
  targetId: PublicKey;
  bidId: PublicKey;
  field?: Field | null;
  fieldId?: PublicKey | null;
  quantity?: number;
  owner: PublicKey;
  amount: BN;
  expireInSec?: BN | null;
  currency?: PublicKey | null;
  makerBroker?: PublicKey | null;
  privateTaker?: PublicKey | null;
  compute?: number | null;
  priorityMicroLamports?: number | null;
  margin?: PublicKey | null;
  cosigner?: PublicKey | null;
  blockhash?: string;
};

export type PlaceBidArgsSerialized = {
  traits: Attribute[];
  otherIxs: SerializedInstruction[];
  target: Target;
  targetId: string;
  bidId: string;
  field?: Field | null;
  fieldId?: string | null;
  quantity?: number;
  owner: string;
  amount: string;
  expireInSec?: string | null;
  currency?: string | null;
  makerBroker?: string | null;
  privateTaker?: string | null;
  compute?: number | null;
  priorityMicroLamports?: number | null;
  margin?: string | null;
  cosigner?: string | null;
  blockhash?: string;
};

export function serializePlaceBidArgs(
  args: PlaceBidArgs,
): PlaceBidArgsSerialized {
  return {
    traits: args.traits, // Assuming Attribute[] doesn't need any transformation
    otherIxs: args.otherIxs.map(serializeInstruction),
    target: args.target, // Assuming Target doesn't need any transformation
    targetId: args.targetId.toString(),
    bidId: args.bidId.toString(),
    field: args.field,
    fieldId: args.fieldId ? args.fieldId.toString() : null,
    quantity: args.quantity,
    owner: args.owner.toString(),
    amount: args.amount.toString(),
    expireInSec: args.expireInSec ? args.expireInSec.toString() : null,
    currency: args.currency ? args.currency.toString() : null,
    makerBroker: args.makerBroker ? args.makerBroker.toString() : null,
    privateTaker: args.privateTaker ? args.privateTaker.toString() : null,
    compute: args.compute,
    priorityMicroLamports: args.priorityMicroLamports,
    margin: args.margin ? args.margin.toString() : null,
    cosigner: args.cosigner ? args.cosigner.toString() : null,
    blockhash: args.blockhash,
  };
}

export function deserializePlaceBidArgs(
  serialized: PlaceBidArgsSerialized,
): PlaceBidArgs {
  return {
    traits: serialized.traits,
    otherIxs: serialized.otherIxs.map(deserializeInstruction),
    target: serialized.target,
    targetId: new PublicKey(serialized.targetId),
    bidId: new PublicKey(serialized.bidId),
    field: serialized.field,
    fieldId: serialized.fieldId ? new PublicKey(serialized.fieldId) : null,
    quantity: serialized.quantity,
    owner: new PublicKey(serialized.owner),
    amount: new BN(serialized.amount),
    expireInSec: serialized.expireInSec ? new BN(serialized.expireInSec) : null,
    currency: serialized.currency ? new PublicKey(serialized.currency) : null,
    makerBroker: serialized.makerBroker
      ? new PublicKey(serialized.makerBroker)
      : null,
    privateTaker: serialized.privateTaker
      ? new PublicKey(serialized.privateTaker)
      : null,
    compute: serialized.compute,
    priorityMicroLamports: serialized.priorityMicroLamports,
    margin: serialized.margin ? new PublicKey(serialized.margin) : null,
    cosigner: serialized.cosigner ? new PublicKey(serialized.cosigner) : null,
    blockhash: serialized.blockhash,
  };
}

export enum TraitBidRequestType {
  TakeCompressed = 'TAKE_COMPRESSED',
  TakeLegacy = 'TAKE_LEGACY',
  PlaceBid = 'PLACE_BID',
}

export type TraitBidsRequest =
  | {
      type: TraitBidRequestType.TakeCompressed;
      args: TakeCompressedArgsSerialized;
    }
  | {
      type: TraitBidRequestType.TakeLegacy;
      args: TakeLegacyArgsSerialized;
    }
  | {
      type: TraitBidRequestType.PlaceBid;
      args: PlaceBidArgsSerialized;
    };
