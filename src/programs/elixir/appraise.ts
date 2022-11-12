import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
} from '@solana/web3.js';
import { BRIDGESPLIT_API } from './constants';
import { findAppraisalAccPda, findExternalAccPda, findPoolAccPda } from './pda';

export async function createAppraisal(
  connection: Connection,
  poolMint: PublicKey,
  nftMint: PublicKey,
  initializer: PublicKey,
): Promise<Transaction | undefined> {
  const [extAcc] = await findExternalAccPda(poolMint);
  const [poolAcc] = await findPoolAccPda(poolMint);
  const [appraiserAcc] = await findAppraisalAccPda(poolMint, nftMint);

  const appAccExists = await connection.getAccountInfo(appraiserAcc);
  if (!!appAccExists) {
    return;
  }

  const appraiserQuery = await fetch(BRIDGESPLIT_API + '/appraiser/ix', {
    method: 'POST',
    body: JSON.stringify({
      appraiser: '3RDTwtVmMcH9zvzqj8mZi9GH8apqWpRZyXB9DWL7QqrP',
      initializer: initializer.toString(),
      index_mint: poolMint.toString(),
      index: poolAcc.toString(),
      external_account: extAcc.toString(),
      asset_mint: nftMint.toString(),
      appraisal: appraiserAcc.toString(),
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
