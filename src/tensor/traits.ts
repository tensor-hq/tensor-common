import { PublicKey } from '@solana/web3.js';
import { Maybe, isNullLike } from '../utils';
import {
  Attribute,
  AttributeCamelCase,
  RarityRanks,
  RaritySystem,
} from './types';

export const getRarityRank = (
  system: RaritySystem,
  ranks: RarityRanks,
): number | null => {
  switch (system) {
    case RaritySystem.Hrtt:
      return (
        ranks.rarityRankTTCustom ??
        ranks.rarityRankTeam ??
        ranks.rarityRankTT ??
        ranks.rarityRankHR ??
        null
      );
    case RaritySystem.Stat:
      return ranks.rarityRankTTStat ?? ranks.rarityRankStat ?? null;
    case RaritySystem.Team:
      return ranks.rarityRankTeam ?? null;
    case RaritySystem.Tn:
      return ranks.rarityRankTN ?? null;
  }
};

// Special trait type to use for filtering by the NFT's name.
export const NAME_TRAIT_TYPE = '<name>';

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

// Synth traits are not stored on-chain
enum SynthTrait {
  DIGITS_ONLY = 'Digits Only',
  LETTERS_ONLY = 'Letters Only',
  PALINDROME = 'Palindrome',
  EMOJI = 'Emoji',
  LANGUAGE = 'Language',
  CATEGORY = 'Category',
  LETTER_COUNT = 'Letter Count',
}

enum TraitType {
  DOMAIN = 'domain',
}

interface SynthTraitArg {
  name?: string;
  currentTraits?: Set<string>;
}

export const DOMAIN_MCC_LIST = [
  'E5ZnBpH9DYcxRkumKdS4ayJ3Ftb6o3E8wSbXw4N92GWg',
  '86deDknZeDhko46gB8SqK7rYc5HnSBjKDvo6Mi7viYS9',
  '6bsj8ybPa9xsc6pcAme4x6LvhKvtCmgA4TwwG4qtFw5Z',
  'GYLiNNu4pqL6QvZKYHW2EMoibVFm2aVJsPHpUVLcU6pL',
  '7yQYe84W7a5VgNvtRzsvy7mPRed5gmL9HnvJfsbPWK9J',
];

export const languageRegex = {
  English: /[a-zA-Z0-9]/,
  Arabic: /[\u0600-\u06FF]/,
  Chinese: /[\u4e00-\u9FFF]/,
  Cyrillic: /[\u0400-\u04FF]/,
  Hindi: /[\u0900-\u097F]/,
  Japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
  Korean: /[\uAC00-\uD7AF]/,
};

// Use this when emojis are in strings because emojis aren't always the same size
const visibleLength = (str: string) =>
  [...new Intl.Segmenter().segment(str)].length;

const isNumeric = (str: string) => /^\d+$/.test(str);
const isAlpha = (str: string) => /^[a-zA-Z]+$/.test(str);
const emojiLength = (str: string) =>
  [...new Intl.Segmenter().segment(str)]
    .map((emoji) => emoji.segment)
    .filter((char) => /\p{Extended_Pictographic}/gu.test(char)).length;

const isPalindrome = (str: string) =>
  str ===
  [...new Intl.Segmenter().segment(str)]
    .map((emoji) => emoji.segment)
    .reverse()
    .join('');

const serializeTraitType = (traitType: string) =>
  traitType.toLowerCase().replace(/[_\s]/g, '');

const determineNumberClub = (name: string) => {
  const number = parseInt(name);
  if (number <= 1000) {
    return '1k Club';
  } else if (number <= 10000) {
    return '10k Club';
  } else if (number <= 100000) {
    return '100k Club';
  }
};

const syntheticTraits = [
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (
        args.name &&
        args.currentTraits &&
        isNumeric(args.name) &&
        !args.currentTraits.has(serializeTraitType(SynthTrait.DIGITS_ONLY))
      ) {
        return { trait_type: SynthTrait.DIGITS_ONLY, value: 'true' };
      }
    },
  },
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (
        args.name &&
        args.currentTraits &&
        isAlpha(args.name) &&
        !args.currentTraits.has(serializeTraitType(SynthTrait.LETTERS_ONLY))
      ) {
        return { trait_type: SynthTrait.LETTERS_ONLY, value: 'true' };
      }
    },
  },
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (
        args.name &&
        args.currentTraits &&
        emojiLength(args.name) > 0 &&
        !args.currentTraits.has(serializeTraitType(SynthTrait.LANGUAGE))
      ) {
        if (emojiLength(args.name) === visibleLength(args.name)) {
          return { trait_type: SynthTrait.LANGUAGE, value: SynthTrait.EMOJI };
        } else {
          return { trait_type: SynthTrait.EMOJI, value: 'certified' };
        }
      }
    },
  },
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (
        args.name &&
        args.currentTraits &&
        isPalindrome(args.name) &&
        !args.currentTraits.has(serializeTraitType(SynthTrait.PALINDROME))
      ) {
        return { trait_type: SynthTrait.PALINDROME, value: 'true' };
      }
    },
  },
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (
        args.name &&
        args.currentTraits &&
        visibleLength(args.name) >= 3 &&
        visibleLength(args.name) <= 5 &&
        !args.currentTraits.has(
          serializeTraitType(`${visibleLength(args.name)} Letters}`),
        )
      ) {
        return {
          trait_type: `${visibleLength(args.name)} Letters`,
          value: 'true',
        };
      }
    },
  },
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (args.name && args.currentTraits && isNumeric(args.name)) {
        const numberClub = determineNumberClub(args.name);
        if (
          numberClub &&
          !args.currentTraits.has(serializeTraitType(SynthTrait.CATEGORY))
        ) {
          return {
            trait_type: SynthTrait.CATEGORY,
            value: numberClub,
          };
        }
      }
    },
  },
  {
    type: TraitType.DOMAIN,
    generate: (args: SynthTraitArg) => {
      if (
        args.name &&
        args.currentTraits &&
        !args.currentTraits.has(serializeTraitType(SynthTrait.LANGUAGE))
      ) {
        let matchingLanguages: Attribute[] = [];
        for (const [language, expression] of Object.entries(languageRegex)) {
          if (expression.test(args.name) && emojiLength(args.name) == 0) {
            matchingLanguages.push({
              trait_type: SynthTrait.LANGUAGE,
              value: language,
            });
          }
        }
        return matchingLanguages.length === 1 ? matchingLanguages[0] : null;
      }
      return null;
    },
  },
];

const createSyntheticTraits = (
  args: SynthTraitArg,
  traitType: TraitType,
  currentAttributes: Attribute[],
) => {
  let newAttributes: Attribute[] = [];
  const { name } = args;

  // Knowing there's no standard, formatting like this reduces chance of duplicates in the future
  const currentTraits = new Set(
    currentAttributes.map((trait) => serializeTraitType(trait.trait_type)),
  );

  for (const synthTrait of syntheticTraits) {
    if (synthTrait.type == traitType) {
      const newTrait = synthTrait.generate({ name, currentTraits });
      if (newTrait) {
        newAttributes.push(newTrait);
      }
    }
  }
  return newAttributes;
};

export const generateDomainTraits = (
  mccPk: PublicKey,
  name: string | null,
  currentAttributes: Attribute[] | null,
) => {
  if (name && DOMAIN_MCC_LIST.includes(mccPk.toBase58())) {
    return createSyntheticTraits(
      { name },
      TraitType.DOMAIN,
      currentAttributes ?? [],
    );
  }
  return [];
};

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

export const matchesTraitFilter = ({
  traitsFilter,
  attributes,
  name,
}: {
  traitsFilter: { traitType: string; values: string[] }[];
  attributes: Maybe<Attribute[]>;
  name: Maybe<string>;
}) => {
  //AND for traits themselves
  return traitsFilter.every(({ traitType, values }) => {
    if (traitType === NAME_TRAIT_TYPE) {
      return !isNullLike(name) && values.includes(name);
    }

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
  attrs: Attribute[] | JsonValue | undefined,
): Attribute[] | null => {
  // --------------------------------------- normalize trait data
  if (
    attrs === undefined ||
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

export const camelCaseAttributes = (
  attributes: Attribute[],
): AttributeCamelCase[] =>
  attributes.map((a) => ({
    traitType: a.trait_type,
    value: a.value,
  }));

export const snakeCaseAttributes = (
  attributes: AttributeCamelCase[],
): Attribute[] =>
  attributes.map((a) => ({
    trait_type: a.traitType,
    value: a.value,
  }));

export const hasMatchingTraits = (
  requiredTraits: Attribute[],
  nftTraits: Attribute[],
): boolean => {
  const requiredTraitsMap: Record<string, string[]> = {};

  for (const item of requiredTraits) {
    requiredTraitsMap[item.trait_type] ??= [];
    requiredTraitsMap[item.trait_type].push(item.value);
  }

  //AND'ing (all traitTypes have to match)
  for (const traitType in requiredTraitsMap) {
    const acceptedValues = requiredTraitsMap[traitType];

    //OR'ing (only one value has to match)
    const match = nftTraits.some(
      (item) =>
        item.trait_type === traitType && acceptedValues.includes(item.value),
    );

    // If there's a trait type without a matching value, return false
    if (!match) {
      return false;
    }
  }

  // If all trait types have a matching value, return true
  return true;
};
