// ======================== Rarities.

import { Metadata } from '@metaplex-foundation/mpl-token-metadata';
import { PublicKey } from '@solana/web3.js';

// NB: Make sure keys are CamelCased vs CAMELCased.
// This is so it aligns with the generated graphql enum keys to make life easier.
export enum RaritySystem {
  Hrtt = 'Hrtt',
  Stat = 'Stat',
  Team = 'Team',
  Tn = 'Tn',
}

export type RarityRanks = {
  rarityRankTT?: number | null;
  rarityRankTTStat?: number | null;
  rarityRankTTCustom?: number | null;
  rarityRankHR?: number | null;
  rarityRankTeam?: number | null;
  rarityRankStat?: number | null;
  rarityRankTN?: number | null;
};

export type Attribute = {
  trait_type: string;
  value: string;
};

export type AttributeCamelCase = {
  traitType: string;
  value: string;
};

// ======================== Traits info.

export type CollectionTraitsMeta = Record<
  string,
  Record<string, { n: number; img: string | null }>
>;

export type CollectionTraitsActive = Record<
  string,
  Record<string, { n: number; p: number }>
>;

// ======================== Sorting.

// NB: Make sure keys are CamelCased vs CAMELCased.
// This is so it aligns with the generated graphql enum keys to make life easier.
export enum MintsSortBy {
  PriceAsc = 'PriceAsc',
  PriceDesc = 'PriceDesc',
  LastSaleAsc = 'LastSaleAsc',
  LastSaleDesc = 'LastSaleDesc',
  ListedDesc = 'ListedDesc',
  RankHrttAsc = 'RankHrttAsc',
  RankHrttDesc = 'RankHrttDesc',
  RankStatAsc = 'RankStatAsc',
  RankStatDesc = 'RankStatDesc',
  RankTeamAsc = 'RankTeamAsc',
  RankTeamDesc = 'RankTeamDesc',
  RankTnAsc = 'RankTnAsc',
  RankTnDesc = 'RankTnDesc',
  OrdinalAsc = 'OrdinalAsc',
  OrdinalDesc = 'OrdinalDesc',
  NormalizedPriceAsc = 'NormalizedPriceAsc',
  NormalizedPriceDesc = 'NormalizedPriceDesc',
}

// ======================== SDK args.

export type PnftArgs = {
  /** If provided, skips RPC call to fetch on-chain metadata. */
  meta?: {
    address: PublicKey;
    metadata: Metadata;
  };
  /** Ix arg params if rule set requires it. */
  authData?: any | null;
  /** passing in null or undefined means these ixs are NOT included */
  compute?: number | null;
  /** If a ruleSet is present, we add this many additional */
  ruleSetAddnCompute?: number | null;
  priorityMicroLamports?: number | null;
};
