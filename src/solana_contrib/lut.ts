import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { buildTxV0, confirmTransactionMultConns } from './transaction';

export const createLUT = async ({
  kp,
  conn,
  addresses,
}: {
  kp: Keypair;
  conn: Connection;
  addresses: PublicKey[];
}) => {
  //use finalized, otherwise get "is not a recent slot err"
  const slot = await conn.getSlot();

  //create
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: kp.publicKey,
      payer: kp.publicKey,
      recentSlot: slot,
    });

  //see if already created
  let lookupTableAccount = (
    await conn.getAddressLookupTable(lookupTableAddress)
  ).value;
  if (!!lookupTableAccount) {
    console.debug('LUT exists', lookupTableAddress.toBase58());
    return lookupTableAccount;
  }

  console.debug(`LUT missing, creating: ${lookupTableAddress.toBase58()}`);

  //add addresses
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: kp.publicKey,
    authority: kp.publicKey,
    lookupTable: lookupTableAddress,
    addresses,
  });

  const tx = await buildTxV0({
    connections: [conn],
    feePayer: kp.publicKey,
    instructions: [lookupTableInst, extendInstruction],
    additionalSigners: [kp],
    addressLookupTableAccs: [],
  });
  const sig = await conn.sendTransaction(tx.tx);
  await confirmTransactionMultConns({
    conns: [conn],
    sig,
    timeoutMs: 30 * 1000,
  });

  console.debug('new LUT created', lookupTableAddress.toBase58());

  //fetch
  lookupTableAccount = (await conn.getAddressLookupTable(lookupTableAddress))
    .value;

  return lookupTableAccount;
};

export const updateLUT = async ({
  kp,
  conn,
  lookupTableAddress,
  addresses,
}: {
  kp: Keypair;
  conn: Connection;
  lookupTableAddress: PublicKey;
  /** Add NEW addresses only */
  addresses: PublicKey[];
}) => {
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: kp.publicKey,
    authority: kp.publicKey,
    lookupTable: lookupTableAddress,
    addresses,
  });

  const tx = await buildTxV0({
    connections: [conn],
    feePayer: kp.publicKey,
    instructions: [extendInstruction],
    additionalSigners: [kp],
    addressLookupTableAccs: [],
  });
  const sig = await conn.sendTransaction(tx.tx);
  await confirmTransactionMultConns({
    conns: [conn],
    sig,
    timeoutMs: 30 * 1000,
  });

  console.debug('updated LUT', lookupTableAddress.toBase58());

  //fetch (this will actually show wrong the first time, need to rerun)
  const lookupTableAccount = (
    await conn.getAddressLookupTable(lookupTableAddress)
  ).value;

  return lookupTableAccount;
};
