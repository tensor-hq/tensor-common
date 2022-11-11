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
    case ActiveListingsSortBy.RankHRTTAsc:
    case ActiveListingsSortBy.RankHRTTDesc:
      return getRarityRank(RaritySystem.HRTT, ranks);
    case ActiveListingsSortBy.RankStatAsc:
    case ActiveListingsSortBy.RankStatDesc:
      return getRarityRank(RaritySystem.Stat, ranks);
    case ActiveListingsSortBy.RankTeamAsc:
    case ActiveListingsSortBy.RankTeamDesc:
      return getRarityRank(RaritySystem.Team, ranks);
    case ActiveListingsSortBy.RankTNAsc:
    case ActiveListingsSortBy.RankTNDesc:
      return getRarityRank(RaritySystem.TN, ranks);
  }
};

const getSortSign = (sortBy: ActiveListingsSortBy): 1 | -1 => {
  switch (sortBy) {
    case ActiveListingsSortBy.PriceAsc:
    case ActiveListingsSortBy.RankHRTTAsc:
    case ActiveListingsSortBy.RankStatAsc:
    case ActiveListingsSortBy.RankTeamAsc:
    case ActiveListingsSortBy.RankTNAsc:
      return 1;
    case ActiveListingsSortBy.PriceDesc:
    case ActiveListingsSortBy.ListedDesc:
    case ActiveListingsSortBy.RankHRTTDesc:
    case ActiveListingsSortBy.RankStatDesc:
    case ActiveListingsSortBy.RankTeamDesc:
    case ActiveListingsSortBy.RankTNDesc:
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
