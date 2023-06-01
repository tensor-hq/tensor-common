import { PublicKey } from "@solana/web3.js";
import assert from "assert";

/**
 * Converts a hashlist string to an array of PublicKey objects.
 * The function accepts a string containing a mix of comma-separated, whitespace-separated, or newline-separated public keys,
 * or a valid JSON string array of public keys.
 *
 * @export
 * @param {string} hashlist - The input string containing public keys.
 * @returns {{ errors: string | undefined, pubkeys: PublicKey[] }} - An object containing the array of PublicKey objects and
 * an 'errors' property with a string describing any invalid public keys encountered, or falsey if all public keys are valid.
 *
 * @example
 * const input = 'key1, key2 key3\nkey4,key5';
 * const { errors, pubkeys } = hashlistToPubkeys(input);
 * console.log(errors); // ""
 * console.log(pubkeys); // [PublicKey{...}, PublicKey{...}, ...]
 */
export const hashlistToPublicKeys = (
  hashlist: string
): { errors: string; pubkeys: PublicKey[]; keys: string[] } => {
  let keys: string[];
  let jsonArray: any = undefined;

  try {
    jsonArray = JSON.parse(hashlist);
  } catch (err) {}

  if (hashlist.trim().length === 0) {
    keys = [];
  } else if (Array.isArray(jsonArray)) {
    keys = jsonArray;
  } else {
    // The regular expression matches commas, whitespace, and newlines.
    const regex = /[\s,]+/g;
    keys = hashlist.split(regex);
  }

  const pubkeysMap: Record<string, PublicKey | undefined> = {};
  const pubkeys: PublicKey[] = [];
  const validKeys: string[] = [];
  let errors: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    try {
      const key = keys[i];
      const pubkey = new PublicKey(key);
      if (pubkeysMap[key]) {
        errors.push(`Address #${i + 1} already added: ${key}`);
        continue;
      }
      pubkeysMap[key] = pubkey;
      pubkeys.push(pubkey);
      validKeys.push(key);
    } catch (err: unknown) {
      // Address #1 invalid: 2RtGg6fsFiiF1EQzHqbd66AhW7R5bWeQGpTbv2UMkCdW

      errors.push(`Address #${i + 1} invalid: ${keys[i]}`);
    }
  }

  return { errors: errors.join("\n"), pubkeys, keys: validKeys };
};

/** Calculate setwise a - b and b - a. Note: There is commented code in this function for intersection of a and b as well if needed. */
export function setDifferences<T>(a: Set<T>, b: Set<T>) {
  const aMinusB: T[] = [];
  const bMinusA: T[] = [];
  let intersectionSize = 0;
  // if you want the intersection as well, uncomment this code
  // const intersection: T[] = [];

  for (const beforeItem of b) {
    if (!a.has(beforeItem)) {
      bMinusA.push(beforeItem);
    } else {
      intersectionSize++;
      // intersection.push(beforeItem);
    }
  }
  for (const afterItem of a) {
    if (!b.has(afterItem)) {
      aMinusB.push(afterItem);
    }
  }

  assert(a.size === aMinusB.length + intersectionSize);
  assert(b.size === bMinusA.length + intersectionSize);

  return { aMinusB, bMinusA };
}
