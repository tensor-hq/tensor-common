import { BN, BorshCoder, EventParser } from '@coral-xyz/anchor';
import {
  ParsedAnchorEvent,
  genIxDiscHexMap,
  parseAnchorEvents,
  parseAnchorIxs,
} from '../../src/solana_contrib/anchor';
import { IDL as IDL_TComp } from './test_data/tcomp';
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
} from '../../src/solana_contrib/transaction';

describe('Anchor Tests', () => {
  const tswap = new PublicKey('TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN');
  const tcomp = new PublicKey('TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp');

  const coder = new BorshCoder(IDL);
  const eventParser = new EventParser(tswap, coder);
  const coderV1_6_0 = new BorshCoder(IDL_v1_6_0);
  const eventParserV1_6_0 = new EventParser(tswap, coderV1_6_0);

  const tcmpCoder = new BorshCoder(IDL_TComp);
  const tcmpEventParser = new EventParser(tcomp, tcmpCoder);

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
  });
});
