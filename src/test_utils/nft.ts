import {
  PROGRAM_ID as AUTH_PROGRAM_ID,
  Payload,
} from '@metaplex-foundation/mpl-token-auth-rules';
import {
  CreateInstructionAccounts,
  CreateInstructionArgs,
  MintInstructionAccounts,
  MintInstructionArgs,
  TokenStandard,
  createCreateInstruction,
  createMintInstruction,
  createVerifyCollectionInstruction,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Signer,
} from '@solana/web3.js';
import {
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
} from '../metaplex';
import { buildAndSendTx, createFundedWallet } from './tx';
import { dedupeList, filterNullLike } from '../utils';

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
              verified: !!c.authority,
            };
          }) ?? null,
        primarySaleHappened: true,
        isMutable: true,
        tokenStandard,
        collection: collection
          ? // Must be verified as separate ix for nfts.
            { verified: false, key: collection.publicKey }
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
  const tokenPda = getAssociatedTokenAddressSync(
    mint.publicKey,
    owner.publicKey,
  );

  const [tokenRecord] = findTokenRecordPda(mint.publicKey, tokenPda);

  const mintAcccounts: MintInstructionAccounts = {
    token: tokenPda,
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

  const payload: Payload = {
    map: new Map(),
  };

  const mintArgs: MintInstructionArgs = {
    mintArgs: {
      __kind: 'V1',
      amount: 1,
      authorizationData: {
        payload: payload as any,
      },
    },
  };

  const mintIx = createMintInstruction(mintAcccounts, mintArgs);
  // Have to do separately o/w for regular NFTs it'll complain about
  // collection verified can't be set.
  const verifyIxs =
    collection && collectionVerified
      ? [
          createVerifyCollectionInstruction({
            metadata,
            collectionAuthority: owner.publicKey,
            payer: owner.publicKey,
            collectionMint: collection.publicKey,
            collection: findMetadataPda(collection.publicKey)[0],
            collectionMasterEditionAccount: findMasterEditionPda(
              collection.publicKey,
            )[0],
          }),
        ]
      : [];

  // --------------------------------------- send

  await buildAndSendTx({
    conn,
    payer,
    ixs: [createIx, mintIx, ...verifyIxs],
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
    tokenAddress: tokenPda,
    metadataAddress: metadata,
    masterEditionAddress: masterEdition,
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
  collectionVerified?: boolean;
  programmable?: boolean;
  ruleSetAddr?: PublicKey;
}): Promise<{
  mint: PublicKey;
  ata: PublicKey;
  owner: Keypair;
  metadata: PublicKey;
  masterEdition: PublicKey;
}> => {
  const usedOwner = owner ?? (await createFundedWallet({ conn, payer }));
  const usedMint = mint ?? Keypair.generate();

  //create a verified collection
  if (collection) {
    await createNft({
      conn,
      payer,
      owner: usedOwner,
      mint: collection,
      tokenStandard: TokenStandard.NonFungible,
      royaltyBps,
    });
  }

  const { metadataAddress, tokenAddress, masterEditionAddress } =
    await createNft({
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
    ata: tokenAddress,
    owner: usedOwner,
    metadata: metadataAddress,
    masterEdition: masterEditionAddress,
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
  programmable?: boolean;
  ruleSetAddr?: PublicKey;
}) => {
  const { mint, ata, metadata, masterEdition } = await createAndFundAta({
    conn,
    payer,
    owner,
    royaltyBps,
    creators,
    collection,
    collectionVerified,
    programmable,
    ruleSetAddr,
  });

  const { ata: otherAta } = await createAta({
    conn,
    payer,
    mint,
    owner: other,
  });

  return { mint, metadata, ata, otherAta, masterEdition };
};
