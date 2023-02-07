// ======================== Rarities.

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
  rarityRankHR?: number | null;
  rarityRankTeam?: number | null;
  rarityRankStat?: number | null;
  rarityRankTN?: number | null;
};

export type Attribute = {
  trait_type: string;
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
export enum ActiveListingsSortBy {
  PriceAsc = 'PriceAsc',
  PriceDesc = 'PriceDesc',
  ListedDesc = 'ListedDesc',
  RankHrttAsc = 'RankHrttAsc',
  RankHrttDesc = 'RankHrttDesc',
  RankStatAsc = 'RankStatAsc',
  RankStatDesc = 'RankStatDesc',
  RankTeamAsc = 'RankTeamAsc',
  RankTeamDesc = 'RankTeamDesc',
  RankTnAsc = 'RankTnAsc',
  RankTnDesc = 'RankTnDesc',
}
