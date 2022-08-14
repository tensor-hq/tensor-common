import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  AuctionHouse,
  createDepositInstruction,
  createWithdrawInstruction,
} from '@metaplex-foundation/mpl-auction-house/dist/src/generated';
import { findAuctionHouseBuyerEscrowPda } from '@metaplex-foundation/js';
import { buildTx } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';

export const makeAHDepositWithdrawTx = async (
  connections: Array<Connection>,
  action: 'deposit' | 'withdraw',
  auctionHouse: string,
  owner: string,
  amountLamports: BN,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];
  const additionalSigners: Keypair[] = [];

  const auctionHouseKey = new PublicKey(auctionHouse);
  const ownerKey = new PublicKey(owner);

  const auctionHouseObj = await AuctionHouse.fromAccountAddress(
    connection,
    auctionHouseKey,
  );

  const escrowPaymentAccount = await findAuctionHouseBuyerEscrowPda(
    auctionHouseKey,
    ownerKey,
  );

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
            amount: amountLamports,
            escrowPaymentBump: escrowPaymentAccount.bump,
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
            amount: amountLamports,
            escrowPaymentBump: escrowPaymentAccount.bump,
          },
        );

  instructions.push(ix);

  return buildTx({
    connections,
    instructions,
    additionalSigners,
    feePayer: ownerKey,
  });
};
