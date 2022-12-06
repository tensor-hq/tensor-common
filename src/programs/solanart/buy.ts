import { Metaplex } from '@metaplex-foundation/js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import { buildTx, getOrCreateAtaForMint } from '../../solana_contrib';
import { TxWithHeight } from '../../solana_contrib/types';
import {
  BADGER_PROGRAM_ID,
  findBadgerPda,
  findDataEscrowPda,
  findRoyaltiesPda,
  SOLANART_ESCROW_OWNER_ACCT,
  SOLANART_FEE_ACCT,
  SOLANART_PROGRAM_ID,
} from './shared';

export const makeSolanartBuyTx = async (
  connections: Array<Connection>,
  buyer: string,
  seller: string,
  tokenMint: string,
  priceLamports: BN,
): Promise<TxWithHeight> => {
  const connection = connections[0];
  const instructions: TransactionInstruction[] = [];

  const buyerAcc = new PublicKey(buyer);
  const sellerAcc = new PublicKey(seller);
  const mintAcc = new PublicKey(tokenMint);

  const { tokenAccount: targetTokenAccount, instructions: tokenInstr } =
    await getOrCreateAtaForMint({
      connection,
      owner: buyerAcc,
      mint: mintAcc,
    });

  const metaplex = new Metaplex(connection);
  const nft = await metaplex.nfts().findByMint(mintAcc).run();

  const currTempTokenAcc = (
    await connection.getTokenLargestAccounts(mintAcc)
  ).value.find((r) => r.uiAmount === 1);

  if (!currTempTokenAcc) {
    throw new Error(`cannot find current token account for ${tokenMint}`);
  }

  const [escrowDataAcc] = findDataEscrowPda(mintAcc);
  const [royaltiesAcc] = findRoyaltiesPda(mintAcc, sellerAcc);
  const [badgerAcc] = findBadgerPda(sellerAcc);

  const data = Buffer.from([0x5, ...priceLamports.toBuffer('le', 8)]);

  const instructionAccounts = [
    /// 0. [signer] The account of the buyer
    {
      pubkey: buyerAcc,
      isSigner: true,
      isWritable: true,
    },
    /// 1.  [] buyer token account to receive the NFT
    {
      pubkey: targetTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    /// 2. [writable] current temporary token account of the NFT
    {
      pubkey: currTempTokenAcc.address,
      isSigner: false,
      isWritable: true,
    },
    /// 3. [writable] seller address
    {
      pubkey: sellerAcc,
      isSigner: false,
      isWritable: true,
    },
    /// 4. [writable] Escrow data account for the sale
    {
      pubkey: escrowDataAcc,
      isSigner: false,
      isWritable: true,
    },
    /// 5. [writable] Royalties data account for the sale
    {
      pubkey: royaltiesAcc,
      isSigner: false,
      isWritable: true,
    },

    /// 6. [] token program
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    /// 7. [] solanart fee address
    {
      pubkey: SOLANART_FEE_ACCT,
      isSigner: false,
      isWritable: true,
    },
    /// 8. [] PDA, owner of temp token account
    {
      pubkey: SOLANART_ESCROW_OWNER_ACCT,
      isSigner: false,
      isWritable: false,
    },
    /// 9. [] metadata account
    {
      pubkey: nft.metadataAddress,
      isSigner: false,
      isWritable: false,
    },
    /// 10. [writable] mint pubkey
    {
      pubkey: mintAcc,
      isSigner: false,
      isWritable: true,
    },
    /// 11. [] Badgers Stake Account
    { pubkey: badgerAcc, isSigner: false, isWritable: true },

    /// 12. [] Badgers Stake program ID
    {
      pubkey: BADGER_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    /// 13. [] system Program
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  ///
  ///  + `[writable]` Creator wallets (up to 5) - all creators
  ///

  for (let i = 0; i < nft.creators.length; i++) {
    const creator = nft.creators[i];
    instructionAccounts.push({
      pubkey: new PublicKey(creator.address),
      isSigner: false,
      isWritable: true,
    });
  }

  const transactionInstruction = new TransactionInstruction({
    programId: SOLANART_PROGRAM_ID,
    keys: instructionAccounts,
    data,
  });

  if (tokenInstr.length) {
    instructions.push(...tokenInstr);
  }
  instructions.push(transactionInstruction);

  return buildTx({
    connections,
    instructions,
    feePayer: buyerAcc,
  });
};
