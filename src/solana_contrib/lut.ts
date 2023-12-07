import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import { buildTxV0, confirmTransactionMultConns } from './transaction';
import { waitMS } from '../time';
import { isNullLike } from '../utils';

export const createLUT = async ({
  payer,
  conn,
  addresses,
}: {
  payer: Keypair;
  conn: Connection;
  addresses: PublicKey[];
}): Promise<AddressLookupTableAccount> => {
  //use finalized, otherwise get "is not a recent slot err"
  const slot = await conn.getSlot('finalized');

  //create
  const [lookupTableInst, lookupTableAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: payer.publicKey,
      payer: payer.publicKey,
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
    payer: payer.publicKey,
    authority: payer.publicKey,
    lookupTable: lookupTableAddress,
    addresses,
  });

  const tx = await buildTxV0({
    connections: [conn],
    feePayer: payer.publicKey,
    instructions: [lookupTableInst, extendInstruction],
    additionalSigners: [payer],
    addressLookupTableAccs: [],
  });
  const sig = await conn.sendTransaction(tx.tx, { skipPreflight: true });
  await confirmTransactionMultConns({
    conns: [conn],
    sig,
    timeoutMs: 30 * 1000,
  });

  console.debug('new LUT created', lookupTableAddress.toBase58());

  //fetch
  lookupTableAccount = (await conn.getAddressLookupTable(lookupTableAddress))
    .value;

  return lookupTableAccount!;
};

export const upsertLUT = async ({
  payer,
  conn,
  lookupTableAddress,
  addresses,
  keepRetryingBlockhash = false,
}: {
  payer: Keypair;
  conn: Connection;
  lookupTableAddress: PublicKey;
  addresses: PublicKey[];
  keepRetryingBlockhash?: boolean;
}): Promise<AddressLookupTableAccount> => {
  let exist = (await conn.getAddressLookupTable(lookupTableAddress)).value;
  if (isNullLike(exist)) {
    console.debug('LUT missing, creating: ', lookupTableAddress.toBase58());
    return createLUT({ payer: payer, conn, addresses });
  }

  // Filter out only new adresses.
  addresses = addresses.filter(
    (a) => !exist!.state.addresses.some((a2) => a2.equals(a)),
  );

  if (!addresses.length) {
    console.debug('no new addresses for', lookupTableAddress.toBase58());
    return exist;
  }

  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: payer.publicKey,
    authority: payer.publicKey,
    lookupTable: lookupTableAddress,
    addresses,
  });

  const tx = await buildTxV0({
    connections: [conn],
    feePayer: payer.publicKey,
    instructions: [extendInstruction],
    additionalSigners: [payer],
    addressLookupTableAccs: [],
  });

  let done = false;
  while (!done) {
    try {
      const sig = await conn.sendTransaction(tx.tx, { skipPreflight: true });
      await confirmTransactionMultConns({
        conns: [conn],
        sig,
        timeoutMs: 30 * 1000,
      });
      done = true;
    } catch (e) {
      console.log('failed', e);
      if (!keepRetryingBlockhash) {
        throw e;
      }
      await waitMS(1000);
    }
  }

  console.debug('updated LUT', lookupTableAddress.toBase58());

  //fetch (this will actually show wrong the first time, need to rerun)
  const table = (await conn.getAddressLookupTable(lookupTableAddress)).value;

  return table!;
};
