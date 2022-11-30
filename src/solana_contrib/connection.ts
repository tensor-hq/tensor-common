import { Connection } from '@solana/web3.js';
import { rejectAfterDelay, TimeoutError } from '../utils';

export const FAILOVER_ASYNC_METHODS = [
  'getBalanceAndContext',
  'getBalance',
  'getBlockTime',
  'getMinimumLedgerSlot',
  'getFirstAvailableBlock',
  'getSupply',
  'getTokenSupply',
  'getTokenAccountBalance',
  'getTokenAccountsByOwner',
  'getParsedTokenAccountsByOwner',
  'getLargestAccounts',
  'getTokenLargestAccounts',
  'getAccountInfoAndContext',
  'getParsedAccountInfo',
  'getAccountInfo',
  'getMultipleAccountsInfoAndContext',
  'getMultipleAccountsInfo',
  'getStakeActivation',
  'getProgramAccounts',
  'getParsedProgramAccounts',
  'confirmTransaction',
  'confirmTransaction',
  'getClusterNodes',
  'getVoteAccounts',
  'getSlot',
  'getSlotLeader',
  'getSlotLeaders',
  'getSignatureStatus',
  'getSignatureStatuses',
  'getTransactionCount',
  'getTotalSupply',
  'getInflationGovernor',
  'getInflationReward',
  'getEpochInfo',
  'getEpochSchedule',
  'getLeaderSchedule',
  'getMinimumBalanceForRentExemption',
  'getRecentBlockhashAndContext',
  'getRecentPerformanceSamples',
  'getFeeCalculatorForBlockhash',
  'getFeeForMessage',
  'getRecentBlockhash',
  'getLatestBlockhash',
  'getLatestBlockhashAndContext',
  'getVersion',
  'getGenesisHash',
  'getBlock',
  'getBlock',
  'getBlockHeight',
  'getBlockProduction',
  'getTransaction',
  'getTransaction',
  'getParsedTransaction',
  'getParsedTransactions',
  'getTransactions',
  'getTransactions',
  'getConfirmedBlock',
  'getBlocks',
  'getBlockSignatures',
  'getConfirmedBlockSignatures',
  'getConfirmedTransaction',
  'getParsedConfirmedTransaction',
  'getParsedConfirmedTransactions',
  'getConfirmedSignaturesForAddress',
  'getConfirmedSignaturesForAddress2',
  'getSignaturesForAddress',
  'getAddressLookupTable',
  'getNonceAndContext',
  'getNonce',
  'requestAirdrop',
  'getStakeMinimumDelegation',
  'simulateTransaction',
  'simulateTransaction',
  'sendTransaction',
  'sendTransaction',
  'sendRawTransaction',
  'sendEncodedTransaction',
];

/// This will failover from connection 0..N-1 if an ECONNREFUSED/503/timeout error is encountered.
export const makeFailoverConnection = (
  conns: Connection[],
  options?: { timeoutMS?: number; failoverAsyncMethods?: string[] },
): Connection => {
  if (!conns.length)
    throw new Error('require at least 1 connection for failover');

  const timeoutMS = options?.timeoutMS;
  const methods = options?.failoverAsyncMethods ?? FAILOVER_ASYNC_METHODS;

  const handler: ProxyHandler<Connection> = {
    get: (target, prop, receiver) => {
      if (!methods.includes(prop.toString())) {
        return Reflect.get(target, prop, receiver);
      }

      // NB: can't be arrow function.
      return async function () {
        for (const [idx, conn] of conns.entries()) {
          try {
            //@ts-ignore
            const promise = conn[prop].apply(conn, arguments);
            const res = await (timeoutMS
              ? // Promise with timeout rejection.
                Promise.race([promise, rejectAfterDelay(timeoutMS)])
              : promise);
            return res;
          } catch (err: any) {
            console.warn(`conn ${idx} error:`, err);
            if (
              err instanceof TimeoutError ||
              err.message?.includes('503 Service Unavailable') ||
              err.message?.includes('ECONNREFUSED')
            ) {
              continue;
            }
            throw err;
          }
        }
        throw new Error(
          `503 Service Unavailable/ECONNREFUSED/timeout across ${conns.length} provider(s)`,
        );
      };
    },
  };

  return new Proxy(conns[0], handler);
};
