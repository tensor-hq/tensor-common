import { expect } from 'chai';
import { convertTxToLegacy } from '../src/transaction';
import { Connection } from '@solana/web3.js';

describe('Transaction Tests', () => {
  describe('convertTxToLegacy', () => {
    it('works for converted legacy', () => {
      const tx = convertTxToLegacy(require('./test_data/tcomp_list_tx.json'));

      expect(tx.transaction.message.accountKeys).length(18);
      expect(tx.transaction.message.instructions).length(3);
      expect(tx.transaction.message.instructions[2].data).eq(
        '6bYvZLjn1VqWBck4eUxtqtLioEbgQMxtz7EcYjsTZWd6dhaWCfifftkSzHdxmaXhF3Pj8kLreTKTPCngMbFPfPXHsoGp8C2Gd5a5MT8tsRtGZ4Sjs62YDsNZeU1Gcr7o9RUdbP5vHBp36K8Y76YfhpLyEUws97YKZRjZqkHYmz8u86s',
      );

      // Idempotent
      expect(convertTxToLegacy(tx)).eql(tx);
    });
    it('works for v0 tx', () => {
      const tx = convertTxToLegacy(
        require('./test_data/tensorian_mint_tx_v0.json'),
      );

      expect(tx.transaction.message.accountKeys).length(25);
      expect(tx.transaction.message.instructions).length(3);
      expect(tx.transaction.message.instructions[2].data).eq(
        '2YfLeUq2vWc9gvS51bWNrR4JhUqTmZNxK9msgrWDqDyHkWd7CsVXyn6Uz9ziU1u4irgoSqwDF5rQz5sXDBfKs3mx1EY6GGDnGRr8c3zrheRK8TmtsShDn7k8rgYG3o9Jkw6CFfdyKug5XcaTmsAhMLqQWNnnqPrM6H5EzAM36yrcUUVP24BB1k4LFPwX24MT91mtyauGzchCximrGeDcjFhbNj4kDMvSQHtALpxwYkKUbHE3GCBvwGMB5eTtPv7G8WfVekiKQdVv22KTyxBhzZbnUEFUArJWuhk5bThg2n9CCFtgvAHCQSBnvrY27L6oYwtwZwU6J4PCyPoT64nu5rPAUNUrh6UxAL2KYUA4jnskxU8yvkJYJBS9FTqSMepShzvRCyfjZi2sRWsYXy',
      );

      // Idempotent
      expect(convertTxToLegacy(tx)).eql(tx);
    });
  });
});
