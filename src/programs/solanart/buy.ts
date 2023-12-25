import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  AUTH_PROGRAM_ID,
  TMETA_PROGRAM_ID,
  fetchMetadataAcct,
  prepPnftAccounts,
} from '../../metaplex';
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
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

export const makeSolanartBuyTx = async ({
  connections,
  buyer,
  seller,
  tokenMint,
  priceLamports,
  blockhash,
}: {
  connections: Array<Connection>;
  buyer: string;
  seller: string;
  tokenMint: string;
  priceLamports: BN;
  blockhash?: string;
}): Promise<TxWithHeight> => {
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

  const currTempTokenAcc = (
    await connection.getTokenLargestAccounts(mintAcc)
  ).value.find((r) => r.uiAmount === 1);

  if (!currTempTokenAcc) {
    throw new Error(`cannot find current token account for ${tokenMint}`);
  }

  const metadata = await fetchMetadataAcct(connection, mintAcc);

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
      pubkey: metadata.address,
      isSigner: false,
      isWritable: true,
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
    /// INSERT CREATORS ADDRESSES HERE
    /// 14. OPTIONAL [] NFT edition
    /// 15. OPTIONAL [] associated token program
    /// 16. OPTIONAL [] metadata program id
    /// 17. OPTIONAL [] sysvar instruction
    /// 18. OPTIONAL [] owner token record
    /// 19. OPTIONAL [] dest token record
    /// 20. OPTIONAL [] AUTH prog id
    /// 21. OPTIONAL [] ruleset
  ];

  ///
  ///  + `[writable]` Creator wallets (up to 5) - all creators
  ///

  metadata.creators?.forEach((creator) => {
    instructionAccounts.push({
      pubkey: creator.address,
      isSigner: false,
      isWritable: true,
    });
  });

  if (
    metadata.account.tokenStandard === TokenStandard.ProgrammableNonFungible
  ) {
    const {
      ruleSet,
      nftEditionPda,
      meta,
      ownerTokenRecordPda,
      destTokenRecordPda,
    } = await prepPnftAccounts({
      connection,
      nftMint: new PublicKey(tokenMint),
      sourceAta: currTempTokenAcc.address,
      destAta: targetTokenAccount,
    });

    instructionAccounts.push(
      ...[
        {
          pubkey: nftEditionPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },

        {
          pubkey: TMETA_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: ownerTokenRecordPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: destTokenRecordPda,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: AUTH_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
      ],
    );

    if (ruleSet) {
      instructionAccounts.push({
        pubkey: ruleSet,
        isSigner: false,
        isWritable: false,
      });
    }
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
    maybeBlockhash: blockhash
      ? {
          type: 'blockhash',
          blockhash,
        }
      : {
          type: 'blockhashArgs',
          args: {
            connections,
          },
        },
    instructions,
    feePayer: buyerAcc,
  });
};
