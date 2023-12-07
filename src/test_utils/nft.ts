import {
  createCreateInstruction,
  CreateInstructionAccounts,
  CreateInstructionArgs,
  createMintInstruction,
  createVerifyInstruction,
  MintInstructionAccounts,
  MintInstructionArgs,
  TokenStandard,
  VerificationArgs,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from '@solana/web3.js';
import {
  AUTH_PROGRAM_ID,
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
} from '../metaplex';
import { dedupeList, filterNullLike } from '../utils';
import { buildAndSendTx, createFundedWallet } from './tx';

export const createAta = async ({
  conn,
  payer,
  mint,
  owner,
}: {
  conn: Connection;
  payer: Keypair;
  mint: PublicKey;
  owner: Keypair;
}) => {
  const ata = getAssociatedTokenAddressSync(mint, owner.publicKey);
  const createAtaIx = createAssociatedTokenAccountInstruction(
    owner.publicKey,
    ata,
    owner.publicKey,
    mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  await buildAndSendTx({
    conn,
    payer,
    ixs: [createAtaIx],
    extraSigners: [owner],
  });
  return { mint, owner, ata };
};

export type CreatorInput = {
  address: PublicKey;
  share: number;
  authority?: Signer;
};

export const createNft = async ({
  conn,
  payer,
  owner,
  mint,
  tokenStandard,
  royaltyBps,
  creators,
  collection,
  collectionVerified = true,
  ruleSet = null,
}: {
  conn: Connection;
  payer: Keypair;
  owner: Keypair;
  mint: Keypair;
  tokenStandard: TokenStandard;
  royaltyBps?: number;
  creators?: CreatorInput[];
  collection?: Keypair;
  collectionVerified?: boolean;
  ruleSet?: PublicKey | null;
}) => {
  // --------------------------------------- create
  const [metadata] = findMetadataPda(mint.publicKey);
  const [masterEdition] = findMasterEditionPda(mint.publicKey);

  const accounts: CreateInstructionAccounts = {
    metadata,
    masterEdition,
    mint: mint.publicKey,
    authority: owner.publicKey,
    payer: owner.publicKey,
    splTokenProgram: TOKEN_PROGRAM_ID,
    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    updateAuthority: owner.publicKey,
  };

  const args: CreateInstructionArgs = {
    createArgs: {
      __kind: 'V1',
      assetData: {
        name: 'Whatever',
        symbol: 'TSR',
        uri: 'https://www.tensor.trade',
        sellerFeeBasisPoints: royaltyBps ?? 0,
        creators:
          creators?.map((c) => {
            return {
              address: c.address,
              share: c.share,
              verified: false,
            };
          }) ?? null,
        primarySaleHappened: true,
        isMutable: true,
        tokenStandard,
        collection: collection
          ? {
              verified: false,
              key: collection.publicKey,
            }
          : null,
        uses: null,
        collectionDetails: null,
        ruleSet,
      },
      decimals: 0,
      printSupply: { __kind: 'Zero' },
    },
  };

  const createIx = createCreateInstruction(accounts, args);

  // this test always initializes the mint, we we need to set the
  // account to be writable and a signer
  for (let i = 0; i < createIx.keys.length; i++) {
    if (createIx.keys[i].pubkey.toBase58() === mint.publicKey.toBase58()) {
      createIx.keys[i].isSigner = true;
      createIx.keys[i].isWritable = true;
    }
  }

  // --------------------------------------- mint

  // mint instrution will initialize a ATA account
  const ata = getAssociatedTokenAddressSync(mint.publicKey, owner.publicKey);

  const [tokenRecord] = findTokenRecordPda(mint.publicKey, ata);
  const mintAcccounts: MintInstructionAccounts = {
    token: ata,
    tokenOwner: owner.publicKey,
    metadata,
    masterEdition,
    tokenRecord,
    mint: mint.publicKey,
    payer: owner.publicKey,
    authority: owner.publicKey,
    sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    splAtaProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    splTokenProgram: TOKEN_PROGRAM_ID,
    authorizationRules: ruleSet ?? undefined,
    authorizationRulesProgram: AUTH_PROGRAM_ID,
  };

  const payload = {
    map: new Map(),
  };

  const mintArgs: MintInstructionArgs = {
    mintArgs: {
      __kind: 'V1',
      amount: 1,
      authorizationData: {
        payload,
      },
    },
  };

  const mintIx = createMintInstruction(mintAcccounts, mintArgs);
  // Have to do separately o/w for regular NFTs it'll complain about
  // collection verified can't be set.
  const verifyCollIxs =
    collection && collectionVerified
      ? [
          createVerifyInstruction(
            {
              authority: owner.publicKey,
              metadata,
              collectionMint: collection.publicKey,
              collectionMetadata: findMetadataPda(collection.publicKey)[0],
              collectionMasterEdition: findMasterEditionPda(
                collection.publicKey,
              )[0],
              sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
            },
            {
              verificationArgs: VerificationArgs.CollectionV1,
            },
          ),
        ]
      : [];

  const verifyCreatorIxs = filterNullLike(
    creators?.map((c) => {
      if (!c.authority) return;
      return createVerifyInstruction(
        {
          metadata,
          authority: c.authority.publicKey,
          sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          verificationArgs: VerificationArgs.CreatorV1,
        },
      );
    }) ?? [],
  );

  // --------------------------------------- send

  await buildAndSendTx({
    conn,
    payer,
    ixs: [createIx, mintIx, ...verifyCollIxs, ...verifyCreatorIxs],
    extraSigners: dedupeList(
      filterNullLike([
        owner,
        mint,
        ...(creators?.map((c) => c.authority) ?? []),
      ]),
      (k) => k.publicKey.toBase58(),
    ),
  });

  return {
    ata,
    metadata,
    masterEdition,
  };
};

export const createAndFundAta = async ({
  conn,
  payer,
  owner,
  mint,
  royaltyBps,
  creators,
  collection,
  collectionVerified,
  createCollection = true,
  programmable = false,
  ruleSetAddr,
}: {
  conn: Connection;
  payer: Keypair;
  owner?: Keypair;
  mint?: Keypair;
  royaltyBps?: number;
  creators?: CreatorInput[];
  collection?: Keypair;
  createCollection?: boolean;
  collectionVerified?: boolean;
  programmable?: boolean;
  ruleSetAddr?: PublicKey;
}): Promise<{
  mint: PublicKey;
  ata: PublicKey;
  owner: Keypair;
  metadata: PublicKey;
  masterEdition: PublicKey;
  collectionInfo?: {
    mint: PublicKey;
    metadata: PublicKey;
    masterEdition: PublicKey;
  };
}> => {
  const usedOwner = owner ?? (await createFundedWallet({ conn, payer }));
  const usedMint = mint ?? Keypair.generate();

  let collectionInfo;
  //create a verified collection
  if (createCollection && collection) {
    collectionInfo = await createNft({
      conn,
      payer,
      owner: usedOwner,
      mint: collection,
      tokenStandard: TokenStandard.NonFungible,
      royaltyBps,
    });
  }

  const { metadata, ata, masterEdition } = await createNft({
    conn,
    payer,
    mint: usedMint,
    owner: usedOwner,
    royaltyBps,
    creators,
    collection,
    collectionVerified,
    ruleSet: ruleSetAddr,
    tokenStandard: programmable
      ? TokenStandard.ProgrammableNonFungible
      : TokenStandard.NonFungible,
  });

  return {
    mint: usedMint.publicKey,
    ata,
    owner: usedOwner,
    metadata,
    masterEdition,
    collectionInfo,
  };
};

/** Creates a mint + 2 ATAs. The `owner` will have the mint initially. */
export const makeMintTwoAta = async ({
  conn,
  payer,
  owner,
  other,
  royaltyBps,
  creators,
  collection,
  collectionVerified,
  createCollection,
  programmable,
  ruleSetAddr,
}: {
  conn: Connection;
  payer: Keypair;
  owner: Keypair;
  other: Keypair;
  royaltyBps?: number;
  creators?: CreatorInput[];
  collection?: Keypair;
  collectionVerified?: boolean;
  createCollection?: boolean;
  programmable?: boolean;
  ruleSetAddr?: PublicKey;
}) => {
  const { mint, ata, metadata, masterEdition, collectionInfo } =
    await createAndFundAta({
      conn,
      payer,
      owner,
      royaltyBps,
      creators,
      collection,
      collectionVerified,
      createCollection,
      programmable,
      ruleSetAddr,
    });

  const { ata: otherAta } = await createAta({
    conn,
    payer,
    mint,
    owner: other,
  });

  return { mint, metadata, ata, otherAta, masterEdition, collectionInfo };
};
