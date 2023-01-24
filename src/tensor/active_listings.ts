import Big from 'big.js';
import { sortNumberOrBig } from '../math';
import { getRarityRank } from './traits';
import { ActiveListingsSortBy, RarityRanks, RaritySystem } from './types';

export const getActiveListingRank = (
  sortBy: Exclude<
    ActiveListingsSortBy,
    'PriceAsc' | 'PriceDesc' | 'ListedDesc'
  >,
  ranks: RarityRanks,
): number | null => {
  switch (sortBy) {
    case ActiveListingsSortBy.RankHrttAsc:
    case ActiveListingsSortBy.RankHrttDesc:
      return getRarityRank(RaritySystem.Hrtt, ranks);
    case ActiveListingsSortBy.RankStatAsc:
    case ActiveListingsSortBy.RankStatDesc:
      return getRarityRank(RaritySystem.Stat, ranks);
    case ActiveListingsSortBy.RankTeamAsc:
    case ActiveListingsSortBy.RankTeamDesc:
      return getRarityRank(RaritySystem.Team, ranks);
    case ActiveListingsSortBy.RankTnAsc:
    case ActiveListingsSortBy.RankTnDesc:
      return getRarityRank(RaritySystem.Tn, ranks);
  }
};

const getSortSign = (sortBy: ActiveListingsSortBy): 1 | -1 => {
  switch (sortBy) {
    case ActiveListingsSortBy.PriceAsc:
    case ActiveListingsSortBy.RankHrttAsc:
    case ActiveListingsSortBy.RankStatAsc:
    case ActiveListingsSortBy.RankTeamAsc:
    case ActiveListingsSortBy.RankTnAsc:
      return 1;
    case ActiveListingsSortBy.PriceDesc:
    case ActiveListingsSortBy.ListedDesc:
    case ActiveListingsSortBy.RankHrttDesc:
    case ActiveListingsSortBy.RankStatDesc:
    case ActiveListingsSortBy.RankTeamDesc:
    case ActiveListingsSortBy.RankTnDesc:
      return -1;
  }
};

type ActiveListing = {
  grossAmount?: string | null;
  ranks: RarityRanks;
  txAt: number;
};

type SortFunction = (a: ActiveListing, b: ActiveListing) => number;

export const makeActiveListingSortFn = (
  sortBy: ActiveListingsSortBy,
): SortFunction => {
  const sign = getSortSign(sortBy);
  return (a, b) => {
    switch (sortBy) {
      case ActiveListingsSortBy.PriceAsc:
      case ActiveListingsSortBy.PriceDesc:
        return (
          sign *
          sortNumberOrBig(
            a.grossAmount ? new Big(a.grossAmount) : null,
            b.grossAmount ? new Big(b.grossAmount) : null,
          )
        );
      case ActiveListingsSortBy.ListedDesc:
        return sign * (a.txAt - b.txAt);
      default:
        return (
          sign *
          sortNumberOrBig(
            getActiveListingRank(sortBy, a.ranks),
            getActiveListingRank(sortBy, b.ranks),
          )
        );
    }
  };
};
