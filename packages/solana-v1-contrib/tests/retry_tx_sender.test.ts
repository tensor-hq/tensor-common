import { expect } from 'chai';
import { RetryTxSender } from '../src/retry_tx_sender';
import { Connection } from '@solana/web3.js';

/**
 * Test only the confirmation functionality of RetryTxSender for now.
 */
describe('RetryTxSender Tests', () => {
  const conn = new Connection(
    'https://api.mainnet-beta.solana.com',
    'confirmed',
  );

  it('should confirm a transaction successfully', async () => {
    const txSig =
      'ELQ6xaNanS6PvbYVsvTxNhRA1wmo6vBukEJjQQ9pkvipFQAgpEmdvtxLXtvntKFowaUK59TXCTKP5TgykgRWpZ4';
    const retryTxSender = new RetryTxSender({
      connection: conn,
      txSig,
    });

    const { slot: _slot, ...confirmedTx } = await retryTxSender.tryConfirm();
    const expected = {
      txSig: txSig,
      err: null,
    };
    expect(confirmedTx).to.deep.equal(expected);
  }).timeout(10000);

  it('should cancel confirmation when cancelConfirm is called', async () => {
    const nonExistentTxSig =
      'pC32p87RsxFVN9fBRjn5t8SoBvKnDwPiXZstecgF41MRqEt1z9kY4vCbkvnw6B58YRy7iZoAy1vFBDyJVgo3o7e';
    const retryTxSender = new RetryTxSender({
      connection: conn,
      txSig: nonExistentTxSig,
    });

    const startTime = performance.now();

    const confirmPromise = retryTxSender.tryConfirm();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    retryTxSender.cancelConfirm();

    try {
      await confirmPromise;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      expect(duration).to.be.closeTo(2000, 100); // Allow 100ms tolerance
    }
  }).timeout(10000);
});
