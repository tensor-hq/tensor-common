import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { getAuctionHouseBuyerEscrow, getQuantityWithMantissa } from './shared';
import BN from 'bn.js';
import {
  AuctionHouse,
  createDepositInstruction,
  createWithdrawInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';

const makeAHDepositWithdrawTx = async (
  connection: Connection,
  action: 'deposit' | 'withdraw',
  auctionHouse: string,
  owner: string,
  amountLamports: BN,
): Promise<{ tx: Transaction }> => {
  const amount = amountLamports.div(new BN(LAMPORTS_PER_SOL)).toNumber();

  const auctionHouseKey = new PublicKey(auctionHouse);
  const ownerKey = new PublicKey(owner);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const amountAdjusted = new BN(
    await getQuantityWithMantissa(
      connection,
      amount,
      auctionHouseObj.treasuryMint,
    ),
  );

  const [escrowPaymentAccount, escrowPaymentBump] =
    await getAuctionHouseBuyerEscrow(auctionHouseKey, ownerKey);

  const ix =
    action === 'deposit'
      ? createDepositInstruction(
          {
            auctionHouse: auctionHouseKey,
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            authority: auctionHouseObj.authority,
            escrowPaymentAccount,
            paymentAccount: ownerKey,
            transferAuthority: auctionHouseObj.authority, //as per OpenSea
            treasuryMint: auctionHouseObj.treasuryMint,
            wallet: ownerKey,
          },
          {
            amount: amountAdjusted,
            escrowPaymentBump,
          },
        )
      : createWithdrawInstruction(
          {
            auctionHouse: auctionHouseKey,
            auctionHouseFeeAccount: auctionHouseObj.auctionHouseFeeAccount,
            authority: auctionHouseObj.authority,
            escrowPaymentAccount,
            receiptAccount: ownerKey,
            treasuryMint: auctionHouseObj.treasuryMint,
            wallet: ownerKey,
          },
          {
            amount: amountAdjusted,
            escrowPaymentBump,
          },
        );

  const tx = new Transaction().add(ix);
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = ownerKey;

  return { tx };
};
