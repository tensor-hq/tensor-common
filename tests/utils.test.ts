import { expect } from 'chai';
import { removeNullBytes } from '../src/utils';

// deprecated implementation
const removeNullBytesV0 = (str: string) => {
  return str
    .split('')
    .filter((char) => char.codePointAt(0))
    .join('');
};

const implementations = [removeNullBytesV0, removeNullBytes];

describe('removeNullBytes', () => {
  implementations.forEach((removeNullBytesFunction) => {
    describe(`Testing the implementation: ${removeNullBytesFunction.name}`, () => {
      // Basic tests
      it('should remove all null bytes', () => {
        const str = 'a\u0000b\u0000c';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('abc');
      });

      it('should return the same string if no null bytes are present', () => {
        const str = 'abc';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('abc');
      });

      // Edge cases
      it('should return an empty string if input is an empty string', () => {
        const str = '';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('');
      });

      it('should return an empty string if input contains only null bytes', () => {
        const str = '\u0000\u0000\u0000';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('');
      });

      it('should handle strings with multiple consecutive null bytes', () => {
        const str = 'a\u0000\u0000b\u0000\u0000c';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('abc');
      });

      // Other special characters
      it('should not remove other special characters', () => {
        const str = 'a\u0001b\u0002c';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('a\u0001b\u0002c');
      });

      // Null byte at the start and end
      it('should remove null byte at the start of string', () => {
        const str = '\u0000abc';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('abc');
      });

      it('should remove null byte at the end of string', () => {
        const str = 'abc\u0000';
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('abc');
      });

      // Handling long strings
      it('should handle long strings with no null bytes', () => {
        const str = 'a'.repeat(1000);
        const result = removeNullBytesFunction(str);
        expect(result).to.equal(str);
      });

      it('should handle long strings with all null bytes', () => {
        const str = '\u0000'.repeat(1000);
        const result = removeNullBytesFunction(str);
        expect(result).to.equal('');
      });
    });
  });
});
