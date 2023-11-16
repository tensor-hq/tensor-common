import { BN, BorshCoder, EventParser } from '@coral-xyz/anchor';
import {
  ParsedAnchorEvent,
  genIxDiscHexMap,
  parseAnchorEvents,
  parseAnchorIxs,
} from '../../src/solana_contrib/anchor';
import { IDL as IDL_TComp } from './test_data/tcomp';
import { IDL as IDL_TRoll } from './test_data/troll';
import { IDL, Tensorswap } from './test_data/tswap';
import {
  IDL as IDL_v1_6_0,
  Tensorswap as Tensorswap_v1_6_0,
} from './test_data/tswap_v1_6_0';
import { PublicKey, TransactionResponse } from '@solana/web3.js';
import { expect } from 'chai';
import { stringifyPKsAndBNs } from '../../src/utils';
import {
  TransactionResponseJSON,
  castTxResponse,
  convertTxToLegacy,
} from '../../src/solana_contrib/transaction';

describe('Anchor Tests', () => {
  const tswap = new PublicKey('TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN');
  const tcomp = new PublicKey('TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp');
  const troll = new PublicKey('TRoLL7U1qTaqv2FFQ4jneZx5SetannKmrYCR778AkQZ');

  const coder = new BorshCoder(IDL);
  const eventParser = new EventParser(tswap, coder);
  const coderV1_6_0 = new BorshCoder(IDL_v1_6_0);
  const eventParserV1_6_0 = new EventParser(tswap, coderV1_6_0);

  const tcmpCoder = new BorshCoder(IDL_TComp);
  const tcmpEventParser = new EventParser(tcomp, tcmpCoder);

  const trollCoder = new BorshCoder(IDL_TRoll);
  const trollEventParser = new EventParser(troll, trollCoder);

  const expectBuyTx = (event: ParsedAnchorEvent<Tensorswap>) => {
    expect(event.ixName).eq('buySingleListing');
    expect(event.ixSeq).eq(0);
    expect(event.event!.name).eq('BuySellEvent');
    expect(stringifyPKsAndBNs(event.event!.data)).eql({
      currentPrice: '32000000000',
      mmFee: '0',
      tswapFee: '448000000',
      creatorsFee: '2486400000',
    });
  };

  const expectBuySellTx = (
    buyEvent: ParsedAnchorEvent<Tensorswap>,
    sellEvent: ParsedAnchorEvent<Tensorswap>,
  ) => {
    expect(buyEvent.ixName).eq('buyNft');
    expect(buyEvent.ixSeq).eq(0);
    expect(buyEvent.event!.name).eq('BuySellEvent');
    expect(stringifyPKsAndBNs(buyEvent.event!.data)).eql({
      currentPrice: '428931407',
      mmFee: '0',
      tswapFee: '4289314',
      creatorsFee: '0',
    });

    expect(sellEvent.ixName).eq('sellNftTradePool');
    expect(sellEvent.ixSeq).eq(1);
    expect(sellEvent.event!.name).eq('BuySellEvent');
    expect(stringifyPKsAndBNs(sellEvent.event!.data)).eql({
      currentPrice: '428931407',
      mmFee: '10723285',
      tswapFee: '4289314',
      creatorsFee: '0',
    });
  };

  describe('genIxDiscHexMap', () => {
    it('works for TCOMP', () => {
      const ixDisc = genIxDiscHexMap(IDL_TComp);

      expect(ixDisc.tcompNoop).eq('6aa20ae28444df15');
      expect(ixDisc.list).eq('36aec14311298426');
    });

    it('works for TSWAP', () => {
      const ixDisc = genIxDiscHexMap(IDL);

      expect(ixDisc.buySingleListing).eq('f5dc694975624e8d');
      expect(ixDisc.delist).eq('3788cd6b6bad041f');
    });
  });

  describe('parseAnchorEvents', () => {
    it('parses 1 event in 1 tx', () => {
      const tx: TransactionResponseJSON = require('./test_data/tswap_buy_tx.json');
      const events = parseAnchorEvents(
        eventParser,
        tswap,
        tx.meta?.logMessages,
      );
      expect(events).length(1);
      expectBuyTx(events[0]);
    });

    it('parses 2 events in 1 tx', () => {
      const tx: TransactionResponseJSON = require('./test_data/tswap_buy_sell_tx_v1_6_0.json');
      const events = parseAnchorEvents(
        eventParserV1_6_0,
        tswap,
        tx.meta?.logMessages,
      );
      expect(events).length(2);
      expectBuySellTx(events[0], events[1]);
    });

    // Regression: event parser failed before.
    it('parses 0 events in weird logs', () => {
      const tx: TransactionResponse = convertTxToLegacy(
        require('./test_data/troll_commit_tx_v0_1_0.json'),
      );
      const events = parseAnchorEvents(
        trollEventParser,
        troll,
        tx.meta?.logMessages,
      );
      expect(events).length(0);
    });
  });

  describe('parseAnchorIxs', () => {
    it('parses 1 ix in 1 tx', () => {
      const tx: TransactionResponse = castTxResponse(
        require('./test_data/tswap_buy_tx.json'),
      );
      const ixs = parseAnchorIxs<Tensorswap>({
        coder,
        tx,
        programId: tswap,
        eventParser,
      });
      expect(ixs).length(1);
      expect(ixs[0].ix.name).eq('buySingleListing');
      expect(ixs[0].events).length(1);
      expectBuyTx({
        ixName: 'buySingleListing',
        ixSeq: 0,
        event: ixs[0].events[0],
      });
    });

    it('parses 2 ixs in 1 tx', () => {
      const tx: TransactionResponse = castTxResponse(
        require('./test_data/tswap_buy_sell_tx_v1_6_0.json'),
      );
      const ixs = parseAnchorIxs<Tensorswap_v1_6_0>({
        coder: coderV1_6_0,
        tx,
        programId: tswap,
        eventParser: eventParserV1_6_0,
      });
      expect(ixs).length(2);
      expect(ixs[0].ix.name).eq('buyNft');
      expect(ixs[0].events).length(1);
      expect(ixs[0].noopIxs).undefined;
      expect(ixs[1].ix.name).eq('sellNftTradePool');
      expect(ixs[1].events).length(1);
      expect(ixs[1].noopIxs).undefined;

      expectBuySellTx(
        {
          ixName: 'buyNft',
          ixSeq: 0,
          event: ixs[0].events[0],
        },
        {
          ixName: 'sellNftTradePool',
          ixSeq: 1,
          event: ixs[1].events[0],
        },
      );
    });

    it('parses noop ixs', () => {
      const tx: TransactionResponse = castTxResponse(
        require('./test_data/tcomp_list_tx.json'),
      );
      const discs = genIxDiscHexMap(IDL_TComp);

      const ixs = parseAnchorIxs({
        coder: tcmpCoder,
        tx,
        programId: tcomp,
        eventParser: tcmpEventParser,
        noopIxDiscHex: discs.tcompNoop,
      });
      expect(ixs).length(1);
      expect(ixs[0].ix.name).eq('list');
      expect(ixs[0].events).length(0);
      expect(ixs[0].innerIxs).length(6);
      expect(ixs[0].noopIxs).length(1);
      expect(ixs[0].noopIxs![0].data).eq(
        '2EQNXBMggnvDnxGF1BTyEigonCNLCaoDoX6H6szBmh98jLzmzQxRV813acQxXyZnevaz2h8LJbGwCnKnMHHmQ1AEGwAuvxzS34BYuu37szNwntAEvAeqcHdodWC1AVHm2KE7s59Fnseo61UoQstyeJPVjzgjoih9LZB3hCzZkSuc8dbHhspji',
      );
    });

    it('parses troll commit w/ weird struct', () => {
      const tx: TransactionResponse = convertTxToLegacy(
        require('./test_data/troll_commit_tx_v0_1_0.json'),
      );
      const discs = genIxDiscHexMap(IDL_TRoll);

      const ixs = parseAnchorIxs({
        coder: trollCoder,
        tx,
        programId: troll,
        eventParser: trollEventParser,
        noopIxDiscHex: discs.trollNoop,
        formatIxPreprocess: (ix) => {
          return {
            ...ix,
            data: {
              ...ix.data,
              // Nasty user type.
              rewards: [],
            },
          };
        },
      });
      expect(ixs).length(1);
      expect(ixs[0].ix.name).eq('commit');
      expect((ixs[0].ix.data as any).rewards).length(2); // Ensure this didn't get removed.
      expect(ixs[0].events).length(0);
      expect(ixs[0].innerIxs).length(5);
      expect(ixs[0].noopIxs).length(1);
      expect(ixs[0].noopIxs![0].data).eq(
        'rP6bFeNhjSkJBrmfghrwR4mnsHusgcgNrfoxkS5jnho1tcMz5aajRqydKCe1tPcSoqqKD2JAGNbbuGmvJfcmpD2zfXbmeDgGyruB7MKb8McuvM9iHU4wgCYB6ToHD85LHN8p1r6fpnfS4YMwRkkMfRNY3QkCmdvxxANCdzmw1fiUmoobcmr3CnLjPeSMuz5dVEP9HrPZVJ2A6b82MNrqzzT3vtPa1ZuWcnXLEMLftYVM8f1xFiG83Z2tYHWKqVqefFnF3wG6WQAsjqVDuhE24cJT4QeT4U9aB6T5vb3kbrf915Z5pPNmHxLBqna9PX4tJEitKQYyVZk4KzYMQDG9QcaT5AXNABwBF4rD6ywV22Dr1hJXqeoeWzpG4A6v881woTvk6KqA8Ex9RdvaaZJMiQZr7KQBq4nZVHtj3Ks97rsULHJN7466bRGMRNLvLi3Pz8nG8W8dhbH1NuujGbpAuP4LAvJovzpMKiRy3J6pN6P4L1KaFqt5JGGCRkRNKUBCpvEk9WEteqBogwAHSeJzyCNJgZDYe5ACf6mBfxv6fNPfJqw9ANpSp2oBYGn5cFsmGa7obsWeggv7dh',
      );
    });

    it('parses troll fulfill tswap listing w/ other events', () => {
      const tx: TransactionResponse = convertTxToLegacy(
        require('./test_data/troll_fulfill_tswap_listing_v0_1_0.json'),
      );
      const discs = genIxDiscHexMap(IDL_TRoll);

      const ixs = parseAnchorIxs({
        coder: trollCoder,
        tx,
        programId: troll,
        eventParser: undefined,
        noopIxDiscHex: discs.trollNoop,
      });
      expect(ixs).length(1);
      expect(ixs[0].ix.name).eq('fulfillTswapListing');
      expect(ixs[0].events).length(0);
      expect(ixs[0].innerIxs).length(20);
      expect(ixs[0].noopIxs).length(1);
      expect(ixs[0].noopIxs![0].data).eq(
        'bQmCgkmMVK81QTnA4ZMhkwts8vGd1iQoPMwyW2racAuSmrfBvybyJ5YG2iUEUDY6w5sjwq2zfTiRbGeUkTg9jYQpgM8teH68kQBCaW16zS36T63WyM2ZSntjHwd8VdbCvgpYoCEBvWP3xWdfFBmwWbjBXxwNMHAUYaP5YRv7azDquUML21vRGo5sqbHH3pUe3fYHeeHkoB2stozHZWJ6kM5te2Qu4Rx5TDwbNYMYMj2fJLELUaX9toME2qzDsEHTzQHXcvTd962Zv6yL4pdEBRGpJAocVssX6y3qYAnDXuq4As16Fargd8SpnaAe1rsckzma4yJuFJNsC5UXtuFo3ULr71haJp2WRdzZJwh9TGMjUjAKisiCptwPaLgZABeCTzs5hbqQsHBTRzRfkoyjNEa4rETmzwmXJQpDBe8KeJWTTBwca6qk7npXjepBjgSbDc7u6Zj7JBhczqJbFUaDjVFpzXRSN2iFdWx4f9wUt2WjD7cKqEvaVA8HvuYw1QuvMwEsSCC8NtqT18sKfW',
      );
    });
  });
});
