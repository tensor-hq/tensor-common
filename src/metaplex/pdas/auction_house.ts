import { PROGRAM_ID } from '@metaplex-foundation/mpl-auction-house';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { Buffer } from 'buffer';

export const findAuctionHousePda = (
  creator: PublicKey,
  treasuryMint: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('auction_house', 'utf8'),
      creator.toBuffer(),
      treasuryMint.toBuffer(),
    ],
    programId,
  );
};

export const findAuctioneerPda = (
  auctionHouse: PublicKey,
  auctioneerAuthority: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('auctioneer', 'utf8'),
      auctionHouse.toBuffer(),
      auctioneerAuthority.toBuffer(),
    ],
    programId,
  );
};

export const findAuctionHouseProgramAsSignerPda = (
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('auction_house', 'utf8'), Buffer.from('signer', 'utf8')],
    programId,
  );
};

export const findAuctionHouseFeePda = (
  auctionHouse: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('auction_house', 'utf8'),
      auctionHouse.toBuffer(),
      Buffer.from('fee_payer', 'utf8'),
    ],
    programId,
  );
};

export const findAuctionHouseTreasuryPda = (
  auctionHouse: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('auction_house', 'utf8'),
      auctionHouse.toBuffer(),
      Buffer.from('treasury', 'utf8'),
    ],
    programId,
  );
};

export const findAuctionHouseBuyerEscrowPda = (
  auctionHouse: PublicKey,
  buyer: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('auction_house', 'utf8'),
      auctionHouse.toBuffer(),
      buyer.toBuffer(),
    ],
    programId,
  );
};

export const findAuctionHouseTradeStatePda = (
  auctionHouse: PublicKey,
  wallet: PublicKey,
  treasuryMint: PublicKey,
  tokenMint: PublicKey,
  buyPrice: BN,
  tokenSize: BN,
  tokenAccount?: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('auction_house', 'utf8'),
      wallet.toBuffer(),
      auctionHouse.toBuffer(),
      ...(tokenAccount ? [tokenAccount.toBuffer()] : []),
      treasuryMint.toBuffer(),
      tokenMint.toBuffer(),
      buyPrice.toArrayLike(Buffer, 'le', 8),
      tokenSize.toArrayLike(Buffer, 'le', 8),
    ],
    programId,
  );
};

export const findListingReceiptPda = (
  tradeState: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('listing_receipt', 'utf8'), tradeState.toBuffer()],
    programId,
  );
};

export const findBidReceiptPda = (
  tradeState: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bid_receipt', 'utf8'), tradeState.toBuffer()],
    programId,
  );
};

export const findPurchaseReceiptPda = (
  sellerTradeState: PublicKey,
  buyerTradeState: PublicKey,
  programId: PublicKey = PROGRAM_ID,
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('purchase_receipt', 'utf8'),
      sellerTradeState.toBuffer(),
      buyerTradeState.toBuffer(),
    ],
    programId,
  );
};
