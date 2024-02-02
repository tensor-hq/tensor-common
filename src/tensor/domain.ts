import { PublicKey } from "@solana/web3.js";
import { Attribute } from "./types";

const LETTERS_ONLY_FORMATTED = "lettersonly";
const DIGITS_ONLY_FORMATTED = "digitsonly";
const PALINDROME_FORMATTED = "palindrome";
const EMOJI_FORMATTED = "emoji";

// Do these really need to be constants??
const DIGITS_ONLY = "Digits Only";
const LETTERS_ONLY = "Letters Only";
const PALINDROME = "Palindrome";
const EMOJI = "Emoji";

export const DOMAIN_MCC_LIST = [
  "E5ZnBpH9DYcxRkumKdS4ayJ3Ftb6o3E8wSbXw4N92GWg",
  "86deDknZeDhko46gB8SqK7rYc5HnSBjKDvo6Mi7viYS9",
  "6bsj8ybPa9xsc6pcAme4x6LvhKvtCmgA4TwwG4qtFw5Z",
  "GYLiNNu4pqL6QvZKYHW2EMoibVFm2aVJsPHpUVLcU6pL",
  "7yQYe84W7a5VgNvtRzsvy7mPRed5gmL9HnvJfsbPWK9J",
];

export const languageRegex = {
  English: /[a-zA-Z]/,
  Arabic: /[\u0600-\u06FF]/,
  Chinese: /[\u4e00-\u9FFF]/,
  Cyrillic: /[\u0400-\u04FF]/,
  Hindi: /[\u0900-\u097F]/,
  Japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
  Korean: /[\uAC00-\uD7AF]/,
};

// Use this when emojis are in strings because emojis aren't always the same size
const visibleLength = (str: string) => [...new Intl.Segmenter().segment(str)].length;

const isNumeric = (str: string) => /^\d+$/.test(str);
const isAlpha = (str: string) => /^[a-zA-Z]+$/.test(str);
const emojiLength = (str: string) =>
  [...new Intl.Segmenter().segment(str)]
    .map((emoji) => emoji.segment)
    .filter((char) => /\p{Extended_Pictographic}/gu.test(char)).length;

// If performance of this sucks, we can make a native addon for this
const isPalindrome = (str: string) => str === str.split("").reverse().join("");

const determineNumberClub = (name: string) => {
  const number = parseInt(name);
  if (number <= 999) {
    return "999 Club";
  } else if (number <= 10000) {
    return "10k Club";
  } else if (number <= 100000) {
    return "100k Club";
  } else {
    return null;
  }
};

const classifyDomainAttributes = (
  name: string,
  attributes: {
    trait_type: string;
    value: string;
  }[]
) => {
  let newAttributes: Attribute[] = [];

  // Knowing there's no standard, formatting like this reduces chance of duplicates in the future
  const currentTraits = new Set(
    attributes.map((trait) => trait.trait_type.toLowerCase().replace(/[_ ]/g, ""))
  );

  const letterCount = visibleLength(name);
  const letterKey = `${letterCount}letter${letterCount === 1 ? "" : "s"}`;

  if (isNumeric(name)) {
    // Digits only trait
    if (!currentTraits.has(DIGITS_ONLY_FORMATTED)) {
      newAttributes.push({ trait_type: DIGITS_ONLY, value: "true" });
    }
    // Number club traits
    const numberClub = determineNumberClub(name);
    if (numberClub && !currentTraits.has(numberClub.toLowerCase().replace(/[_ ]/g, ""))) {
      newAttributes.push({ trait_type: numberClub, value: "true" });
    }
  } else if (isAlpha(name) && !currentTraits.has(LETTERS_ONLY_FORMATTED)) {
    // Letters only trait
    newAttributes.push({ trait_type: LETTERS_ONLY, value: "true" });
  } else if (emojiLength(name) > 0 && !currentTraits.has(EMOJI_FORMATTED)) {
    // Emoji trait
    newAttributes.push({ trait_type: EMOJI, value: "true" });
  }

  // Letter count trait
  if (!currentTraits.has(letterKey) && !currentTraits.has(letterKey)) {
    newAttributes.push({
      trait_type: `${letterCount} Letter${letterCount === 1 ? "" : "s"}`,
      value: "true",
    });
  }

  // Palindrome trait
  if (!currentTraits.has(PALINDROME_FORMATTED) && isPalindrome(name)) {
    newAttributes.push({ trait_type: PALINDROME, value: "true" });
  }

  // Language traits
  Object.entries(languageRegex).forEach(([language, regex]) => {
    if (regex.test(name)) {
      if (!currentTraits.has(language.toLowerCase())) {
        newAttributes.push({ trait_type: language, value: "true" });
      }
    }
  });

  return newAttributes;
};

export const generateDomainTraits = (
  mccPk: PublicKey | undefined,
  name: string | null,
  currentAttributes: Attribute[] | null
) => {
  const mcc = mccPk?.toBase58();

  if (name && mcc && DOMAIN_MCC_LIST.includes(mcc)) {
    return classifyDomainAttributes(name, currentAttributes ?? []);
  }
  return [];
};
