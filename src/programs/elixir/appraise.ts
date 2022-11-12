import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
} from '@solana/web3.js';
import { BRIDGESPLIT_API } from './constants';

export async function createAppraisal(
  connection: Connection,
  poolMint: PublicKey,
  externalAccount: PublicKey,
  nftMint: PublicKey,
  poolAccount: PublicKey,
  appraisalAccount: PublicKey,
  initializer: Keypair,
): Promise<Transaction | undefined> {
  const appAccExists = await connection.getAccountInfo(appraisalAccount);
  if (!!appAccExists) {
    return;
  }

  const appraiserQuery = await fetch(BRIDGESPLIT_API + '/appraiser/ix', {
    method: 'POST',
    body: JSON.stringify({
      appraiser: '3RDTwtVmMcH9zvzqj8mZi9GH8apqWpRZyXB9DWL7QqrP',
      initializer: initializer.publicKey.toString(),
      index_mint: poolMint.toString(),
      index: poolAccount.toString(),
      external_account: externalAccount.toString(),
      asset_mint: nftMint.toString(),
      appraisal: appraisalAccount.toString(),
      system: SystemProgram.programId.toString(),
      clock: SYSVAR_CLOCK_PUBKEY.toString(),
    }),
  })
    .then(async (response) => {
      // Need to format this response and add this ixn to the txn
      return await response.text();
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.log('Error creating an appraisal', err);
      return null;
    });

  if (appraiserQuery && appraiserQuery !== 'false') {
    return Transaction.from(Buffer.from(appraiserQuery, 'base64'));
  }
}
