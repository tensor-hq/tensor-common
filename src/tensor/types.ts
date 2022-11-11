export enum RaritySystem {
  HRTT = 'HRTT',
  Stat = 'Stat',
  Team = 'Team',
  TN = 'TN',
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

export enum ActiveListingsSortBy {
  PriceAsc = 'PriceAsc',
  PriceDesc = 'PriceDesc',
  ListedDesc = 'ListedDesc',
  RankHRTTAsc = 'RankHRTTAsc',
  RankHRTTDesc = 'RankHRTTDesc',
  RankStatAsc = 'RankStatAsc',
  RankStatDesc = 'RankStatDesc',
  RankTeamAsc = 'RankTeamAsc',
  RankTeamDesc = 'RankTeamDesc',
  RankTNAsc = 'RankTNAsc',
  RankTNDesc = 'RankTNDesc',
}
