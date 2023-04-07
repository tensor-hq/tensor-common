import { isNullLike } from '../utils';
import { Attribute, RarityRanks, RaritySystem } from './types';

export const getRarityRank = (
  system: RaritySystem,
  ranks: RarityRanks,
): number | null => {
  switch (system) {
    case RaritySystem.Hrtt:
      return ranks.rarityRankHR ?? ranks.rarityRankTT ?? null;
    case RaritySystem.Stat:
      return ranks.rarityRankStat ?? ranks.rarityRankTTStat ?? null;
    case RaritySystem.Team:
      return ranks.rarityRankTeam ?? null;
    case RaritySystem.Tn:
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

export const countNonNullAttributes = (
  attributes: Attribute[],
  /// If true, will count attributes with a value of "None" as non-null.
  includeNone = false,
): number => {
  return attributes.filter((a) => {
    if (isNullLike(a.trait_type) || isNullLike(a.value)) {
      return false;
    }

    if (!includeNone && NONE_TRAIT_VALUE === a.value) {
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

// Copied from Prisma.JsonValue.
type JsonObject = { [Key in string]?: JsonValue };
interface JsonArray extends Array<JsonValue> {}
type JsonValue = string | number | boolean | JsonObject | JsonArray | null;

export const normalizeMintTraits = (
  attrs: Attribute[] | JsonValue,
): Attribute[] | null => {
  // --------------------------------------- normalize trait data
  if (
    attrs === null ||
    typeof attrs === 'number' ||
    typeof attrs === 'string' ||
    typeof attrs === 'boolean'
  ) {
    return null;
  }

  // For some collections (rarible), attributes is an object with {traitType: value}.
  const attrsArr = Array.isArray(attrs)
    ? attrs
    : Object.entries(attrs).map(([trait_type, value]) => ({
        trait_type,
        value,
      }));

  // Can't make this an object since mints may have duplicate
  // trait types.
  const traits: Attribute[] = [];
  for (const attr of attrsArr) {
    if (
      attr === null ||
      typeof attr === 'number' ||
      typeof attr === 'string' ||
      typeof attr === 'boolean'
    ) {
      continue;
    }

    if (!('value' in attr)) {
      continue;
    }

    if (!('trait_type' in attr)) {
      continue;
    }

    traits.push({
      // Some collections (nftworlds) have attributes that only have a value type.
      // We assign it to the "attribute" trait type.
      trait_type: (attr['trait_type'] ?? 'attribute') as string,
      // Some projects (SMB) have leading/trailing whitespace.
      // This will also store nulls and undefines
      value: normalizeTraitValue(`${attr['value']}`.trim()),
    });
  }

  return traits;
};
