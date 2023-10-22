import { BN, BorshCoder, EventParser } from '@coral-xyz/anchor';
import {
  ParsedAnchorEvent,
  genIxDiscHexMap,
  parseAnchorEvents,
  parseAnchorIxs,
} from '../../src/solana_contrib/anchor';
import { IDL as IDL_TComp } from './test_data/tcomp';
import { IDL, Tensorswap } from './test_data/tswap';
import { IDL as IDL_v1_6_0 } from './test_data/tswap_v1_6_0';
import { PublicKey, TransactionResponse } from '@solana/web3.js';
import { expect } from 'chai';
import { stringifyPKsAndBNs } from '../../src/utils';
import {
  TransactionResponseJSON,
  castTxResponse,
  convertTxToLegacy,
  extractAllIxs,
} from '../../src/solana_contrib/transaction';

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

  describe('extractAllIxs', () => {
    it('works for complex Tensorian mint', () => {
      const tx = convertTxToLegacy(
        require('./test_data/tensorian_mint_tx_v0.json'),
      );

      const ixs = extractAllIxs({
        tx,
      });
      expect(ixs.length).eq(40);
      ixs.forEach((ix, ixIdx) => {
        if (ixIdx < 2) expect(ix.innerIxs).length(0);
        else if (ixIdx === 2) expect(ix.innerIxs).length(37);
        else expect(ix.innerIxs).undefined;
      });
    });
  });
});
