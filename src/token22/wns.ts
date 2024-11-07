import { utils } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';

export const WNS_PROGRAM_ID = new PublicKey(
  'wns1gDLt8fgLcGhWi5MqAqgXpwEP1JftKE9eZnXS1HM',
);
export const WNS_DIST_PROGRAM_ID = new PublicKey(
  'diste3nXmK7ddDTs1zb6uday6j4etCa9RChD8fJ1xay',
);

export const findWNSGroupPda = (mint: string) => {
  const [groupAccount] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode('group'), new PublicKey(mint).toBuffer()],
    WNS_PROGRAM_ID,
  );

  return groupAccount;
};

export const findWNSMemberPda = (mint: string) => {
  const [groupAccount] = PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode('member'), new PublicKey(mint).toBuffer()],
    WNS_PROGRAM_ID,
  );

  return groupAccount;
};

export const findWNSApprovalPda = (mint: string) => {
  const [approvalAccount] = PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode('approve-account'),
      new PublicKey(mint).toBuffer(),
    ],
    WNS_PROGRAM_ID,
  );

  return approvalAccount;
};

export const findWNSExtraMetasPda = (mint: string) => {
  const [extraMetasAccount] = PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode('extra-account-metas'),
      new PublicKey(mint).toBuffer(),
    ],
    WNS_PROGRAM_ID,
  );

  return extraMetasAccount;
};

export const findWNSDistributionPda = (
  collection: string,
  paymentMint?: PublicKey,
) => {
  const [distributionAccount] = PublicKey.findProgramAddressSync(
    [
      new PublicKey(collection).toBuffer(),
      paymentMint ? paymentMint.toBuffer() : SystemProgram.programId.toBuffer(),
    ],
    WNS_DIST_PROGRAM_ID,
  );

  return distributionAccount;
};
