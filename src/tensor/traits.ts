import { isNullLike } from '../utils';
import { Attribute, RarityRanks, RaritySystem } from './types';

export const getRarityRank = (
  system: RaritySystem,
  ranks: RarityRanks,
): number | null => {
  switch (system) {
    case RaritySystem.HRTT:
      return ranks.rarityRankHR ?? ranks.rarityRankTT ?? null;
    case RaritySystem.Stat:
      return ranks.rarityRankStat ?? ranks.rarityRankTTStat ?? null;
    case RaritySystem.Team:
      return ranks.rarityRankTeam ?? null;
    case RaritySystem.TN:
      return ranks.rarityRankTN ?? null;
  }
};

export const nullLikeTraitValues = [
  'none',
  'null',
  'nill',
  'undefined',
  '',
  'nothing',
  'not present',
  'not_present',
  'not-present',
  'not set',
  'not_set',
  'not-set',
  'not available',
  'not_available',
  'not-available',
  'not',
  'neither',
  'empty',
  'bad',
  'absent',
  'missing',
  'lacking',
  'unavailable',
  'n/a',
  'na',
  'n.a.',
];
export const NONE_TRAIT_VALUE = 'None';

export const normalizeTraitValue = (value: string) => {
  if (nullLikeTraitValues.includes(`${value}`.toLowerCase())) {
    return NONE_TRAIT_VALUE;
  }
  return value;
};

export const countNonNullAttributes = (attributes: Attribute[]): number => {
  return attributes.filter((a) => {
    if (isNullLike(a.trait_type) || isNullLike(a.value)) {
      return false;
    }

    if (nullLikeTraitValues.includes(normalizeTraitValue(a.value))) {
      return false;
    }
    return true;
  }).length;
};

export const matchesTraitFilter = (
  traitsFilter: { traitType: string; values: string[] }[],
  attributes: Attribute[] | null | undefined,
) => {
  //AND for traits themselves
  return traitsFilter.every(({ traitType, values }) => {
    const matches = attributes?.filter((attr) => attr.trait_type === traitType);
    if (!matches?.length) return values.includes(NONE_TRAIT_VALUE);

    //OR for values within the same trait
    const matched = matches.some((m: Attribute) =>
      values.includes(normalizeTraitValue(m.value)),
    );
    return matched;
  });
};
