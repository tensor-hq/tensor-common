import Big from 'big.js';
import { sortBigInt, sortNumberOrBig } from '../math';
import { getRarityRank } from './traits';
import { MintsSortBy, RarityRanks, RaritySystem } from './types';

export const getMintRank = (
  sortBy: Exclude<
    MintsSortBy,
    | 'PriceAsc'
    | 'PriceDesc'
    | 'ListedDesc'
    | 'LastSaleAsc'
    | 'LastSaleDesc'
    | 'OrdinalAsc'
    | 'OrdinalDesc'
    | 'NormalizedPriceAsc'
    | 'NormalizedPriceDesc'
  >,
  ranks: RarityRanks,
): number | null => {
  switch (sortBy) {
    case MintsSortBy.RankHrttAsc:
    case MintsSortBy.RankHrttDesc:
      return getRarityRank(RaritySystem.Hrtt, ranks);
    case MintsSortBy.RankStatAsc:
    case MintsSortBy.RankStatDesc:
      return getRarityRank(RaritySystem.Stat, ranks);
    case MintsSortBy.RankTeamAsc:
    case MintsSortBy.RankTeamDesc:
      return getRarityRank(RaritySystem.Team, ranks);
    case MintsSortBy.RankTnAsc:
    case MintsSortBy.RankTnDesc:
      return getRarityRank(RaritySystem.Tn, ranks);
  }
};

export const getSortSign = (sortBy: MintsSortBy): 1 | -1 => {
  switch (sortBy) {
    case MintsSortBy.PriceAsc:
    case MintsSortBy.LastSaleAsc:
    case MintsSortBy.RankHrttAsc:
    case MintsSortBy.RankStatAsc:
    case MintsSortBy.RankTeamAsc:
    case MintsSortBy.RankTnAsc:
    case MintsSortBy.OrdinalAsc:
    case MintsSortBy.NormalizedPriceAsc:
      return 1;
    case MintsSortBy.PriceDesc:
    case MintsSortBy.LastSaleDesc:
    case MintsSortBy.ListedDesc:
    case MintsSortBy.RankHrttDesc:
    case MintsSortBy.RankStatDesc:
    case MintsSortBy.RankTeamDesc:
    case MintsSortBy.RankTnDesc:
    case MintsSortBy.OrdinalDesc:
    case MintsSortBy.NormalizedPriceDesc:
      return -1;
  }
};

type Mint = {
  grossAmount?: string | null;
  lastSale?: string | null;
  ordinal?: string | null;
  ranks: RarityRanks;
  txAt: number;
  normalizedPrice?: string | null;
};

type SortFunction = (a: Mint, b: Mint) => number;

export const makeMintsSortFn = (sortBy: MintsSortBy): SortFunction => {
  const sign = getSortSign(sortBy);
  //(!) sync with the front-end
  // nulls always come last after the sort.
  const nullsFirst = sign === -1;
  return (a, b) => {
    switch (sortBy) {
      case MintsSortBy.PriceAsc:
      case MintsSortBy.PriceDesc:
        return (
          sign *
          sortNumberOrBig(
            a.grossAmount ? new Big(a.grossAmount) : null,
            b.grossAmount ? new Big(b.grossAmount) : null,
            nullsFirst,
          )
        );
      case MintsSortBy.LastSaleAsc:
      case MintsSortBy.LastSaleDesc:
        return (
          sign *
          sortNumberOrBig(
            a.lastSale ? new Big(a.lastSale) : null,
            b.lastSale ? new Big(b.lastSale) : null,
            nullsFirst,
          )
        );
      case MintsSortBy.ListedDesc:
        return sign * (a.txAt - b.txAt);
      case MintsSortBy.OrdinalAsc:
      case MintsSortBy.OrdinalDesc:
        return (
          sign *
          sortBigInt(
            a.ordinal ? BigInt(a.ordinal) : null,
            b.ordinal ? BigInt(b.ordinal) : null,
            nullsFirst,
          )
        );
      case MintsSortBy.NormalizedPriceAsc:
      case MintsSortBy.NormalizedPriceDesc:
        return (
          sign *
          sortNumberOrBig(
            a.normalizedPrice ? new Big(a.normalizedPrice) : null,
            b.normalizedPrice ? new Big(b.normalizedPrice) : null,
            nullsFirst,
          )
        );
      // NB: need default in case divergence b/w FE & BE.
      default:
        return (
          sign *
          sortNumberOrBig(
            getMintRank(sortBy, a.ranks),
            getMintRank(sortBy, b.ranks),
            nullsFirst,
          )
        );
    }
  };
};
