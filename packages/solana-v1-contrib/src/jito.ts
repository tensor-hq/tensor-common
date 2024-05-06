import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { prependComputeIxs } from './transaction';

// NB: When tipping make sure to not use Address Lookup Tables for the tip accounts.
const JITO_TIP_ACCOUNTS = [
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
].map((k) => new PublicKey(k));
const sampleJitoTipAccount = (): PublicKey =>
  JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];

export const makeJitoTipIx = ({
  payer,
  jitoTip,
}: {
  payer: PublicKey;
  jitoTip: number;
}) =>
  SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: sampleJitoTipAccount(),
    lamports: jitoTip,
  });
