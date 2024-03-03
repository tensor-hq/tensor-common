import { PublicKey } from '@solana/web3.js';
import { describe } from 'mocha';
import { expect } from 'chai';
import { DOMAIN_MCC_LIST, generateDomainTraits } from '../src/tensor/traits';
import { Attribute } from '../src/tensor/types';

describe('traits tests', () => {
  const checkEqualAttributes = (
    arr1: { trait_type: string; value: string }[],
    arr2: { trait_type: string; value: string }[],
  ) => {
    if (arr1.length !== arr2.length) {
      return false;
    }

    const sortedArr1 = arr1.sort((a, b) =>
      a.trait_type.localeCompare(b.trait_type),
    );
    const sortedArr2 = arr2.sort((a, b) =>
      a.trait_type.localeCompare(b.trait_type),
    );

    for (let i = 0; i < sortedArr1.length; i++) {
      if (
        sortedArr1[i].trait_type !== sortedArr2[i].trait_type ||
        sortedArr1[i].value !== sortedArr2[i].value
      ) {
        return false;
      }
    }

    return true;
  };

  describe('parseDomainCollections', () => {
    [
      {
        name: '99',
        original: [],
        expected: [
          { trait_type: 'Digits Only', value: 'true' },
          { trait_type: 'Category', value: '1k Club' },
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: 'foo',
        original: [],
        expected: [
          { trait_type: 'Letters Only', value: 'true' },
          { trait_type: '3 Letters', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: '😃',
        original: [],
        expected: [
          { trait_type: 'Language', value: 'Emoji' },
          { trait_type: 'Palindrome', value: 'true' },
        ],
      },
      {
        name: 'bruh😃',
        original: [],
        expected: [
          { trait_type: 'Emoji', value: 'certified' },
          { trait_type: '5 Letters', value: 'true' },
        ],
      },
      {
        name: 'rac3car',
        original: [],
        expected: [
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: '3😃3',
        original: [],
        expected: [
          { trait_type: 'Emoji', value: 'certified' },
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: '3 Letters', value: 'true' },
        ],
      },
      {
        name: 'racecar',
        original: [],
        expected: [
          { trait_type: 'Letters Only', value: 'true' },
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: '你好世界',
        original: [],
        expected: [
          { trait_type: '4 Letters', value: 'true' },
          { trait_type: 'Language', value: 'Chinese' },
        ],
      },
      {
        name: '你你',
        original: [],
        expected: [
          { trait_type: 'Language', value: 'Chinese' },
          { trait_type: 'Palindrome', value: 'true' },
        ],
      },
      {
        name: '12321',
        original: [],
        expected: [
          { trait_type: 'Digits Only', value: 'true' },
          { trait_type: 'Category', value: '100k Club' },
          { trait_type: '5 Letters', value: 'true' },
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: '1000002',
        original: [],
        expected: [
          { trait_type: 'Digits Only', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: '66',
        original: [{ trait_type: 'Digits Only', value: 'foo' }],
        expected: [
          { trait_type: 'Category', value: '1k Club' },
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: 'Language', value: 'English' },
        ],
      },
      {
        name: 'hola你好世界',
        original: [],
        expected: [],
      },
      {
        name: '123abc',
        original: [],
        expected: [{ trait_type: 'Language', value: 'English' }],
      },
      {
        name: '😃😃😃',
        original: [],
        expected: [
          { trait_type: 'Language', value: 'Emoji' },
          { trait_type: 'Palindrome', value: 'true' },
          { trait_type: '3 Letters', value: 'true' },
        ],
      },
      {
        name: 'racecar123',
        original: [],
        expected: [{ trait_type: 'Language', value: 'English' }],
      },
      {
        name: '12321abc',
        original: [],
        expected: [{ trait_type: 'Language', value: 'English' }],
      },
      {
        name: '66abc',
        original: [{ trait_type: 'Digits Only', value: 'foo' }],
        expected: [
          { trait_type: 'Language', value: 'English' },
          { trait_type: '5 Letters', value: 'true' },
        ],
      },
      {
        name: 'bob',
        original: [{ trait_type: 'palindrome', value: 'true' }],
        expected: [
          { trait_type: 'Language', value: 'English' },
          { trait_type: '3 Letters', value: 'true' },
          { trait_type: 'Letters Only', value: 'true' },
        ],
      },
      {
        name: 'foo',
        original: [{ trait_type: 'LettersOnly', value: 'true' }],
        expected: [
          { trait_type: 'Language', value: 'English' },
          { trait_type: '3 Letters', value: 'true' },
        ],
      },
      {
        name: 'abc123你好',
        original: [],
        expected: [],
      },
    ].forEach(({ name, original, expected }) => {
      it(`handles domain metadata ${name}`, () => {
        const attributes = generateDomainTraits(
          new PublicKey(DOMAIN_MCC_LIST[0]),
          name,
          original,
        );

        expect(attributes).to.not.be.null;
        expect(checkEqualAttributes(attributes as Attribute[], expected)).to.be
          .true;
      });
    });
  });
});
