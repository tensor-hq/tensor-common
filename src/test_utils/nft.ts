import {
  createV1,
  CreateV1InstructionAccounts,
  CreateV1InstructionArgs,
  mintV1,
  verifyCollectionV1,
  verifyCreatorV1,
  MintV1InstructionAccounts,
  MintV1InstructionArgs,
  TokenStandard,
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
} from '@solana/web3.js';
import {
  findMasterEditionPda,
  findMetadataPda,
  findTokenRecordPda,
} from '../metaplex';
import { dedupeList, defaultUmi, filterNullLike } from '../utils';
import { buildAndSendTx, createFundedWallet } from './tx';
import { createNoopSigner, publicKey } from '@metaplex-foundation/umi';

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
}): Promise<{
  mint: PublicKey;
  owner: Keypair;
  ata: PublicKey;
}>  => {
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
}): Promise<{
  ata: PublicKey;
  metadata: PublicKey;
  masterEdition: PublicKey;
}> => {
  // --------------------------------------- create
  const [metadata] = findMetadataPda(mint.publicKey);
  const [masterEdition] = findMasterEditionPda(mint.publicKey);

  const accounts: CreateV1InstructionAccounts = {
    metadata: publicKey(metadata),
    masterEdition: publicKey(masterEdition),
    mint: publicKey(mint.publicKey),
    authority: createNoopSigner(publicKey(owner.publicKey)),
    payer: createNoopSigner(publicKey(owner.publicKey)),
    updateAuthority: createNoopSigner(publicKey(owner.publicKey)),
  };

  const args: CreateV1InstructionArgs = {
    name: 'Whatever',
    symbol: 'TSR',
    uri: 'https://www.tensor.trade',
    sellerFeeBasisPoints: {
      basisPoints: royaltyBps ? BigInt(royaltyBps) : BigInt(0),
      identifier: "%",
      decimals: 2,
    },
    creators:
      creators?.map((c) => {
        return {
          address: publicKey(c.address),
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
          key: publicKey(collection.publicKey),
        }
      : null,
    uses: null,
    collectionDetails: null,
    ruleSet: ruleSet ? publicKey(ruleSet) : null,
  decimals: 0,
  printSupply: { __kind: 'Zero' },
  };

  const createIx = createV1(defaultUmi, { ...accounts, ...args }).getInstructions()[0];

  // this test always initializes the mint, we we need to set the
  // account to be writable and a signer
  for (let i = 0; i < createIx.keys.length; i++) {
    if (new PublicKey(createIx.keys[i].pubkey) == mint.publicKey) {
      createIx.keys[i].isSigner = true;
      createIx.keys[i].isWritable = true;
    }
  }

  // --------------------------------------- mint

  // mint instrution will initialize a ATA account
  const ata = getAssociatedTokenAddressSync(mint.publicKey, owner.publicKey);

  const [tokenRecord] = findTokenRecordPda(mint.publicKey, ata);
  const mintAcccounts: MintV1InstructionAccounts = {
    token: publicKey(ata),
    tokenOwner: publicKey(owner.publicKey),
    metadata: publicKey(metadata),
    masterEdition: publicKey(masterEdition),
    tokenRecord: publicKey(tokenRecord),
    mint: publicKey(mint.publicKey),
    payer: createNoopSigner(publicKey(owner.publicKey)),
    authority: createNoopSigner(publicKey(owner.publicKey)),
    authorizationRules: ruleSet ? publicKey(ruleSet): undefined,
  };

  const payload = {
    map: new Map(),
  };

  const mintArgs: MintV1InstructionArgs = {    
      amount: 1,
      authorizationData: {
        payload,
      },
      tokenStandard,
  };

  const mintIx = mintV1(defaultUmi, {...mintAcccounts, ...mintArgs}).getInstructions()[0];
  // Have to do separately o/w for regular NFTs it'll complain about
  // collection verified can't be set.
  const verifyCollIxs =
    collection && collectionVerified
      ? [
        verifyCollectionV1(
          defaultUmi,
            {
              authority: createNoopSigner(publicKey(owner.publicKey)),
              metadata: publicKey(metadata),
              collectionMint: publicKey(collection.publicKey),
              collectionMetadata: publicKey(findMetadataPda(collection.publicKey)[0]),
              collectionMasterEdition: publicKey(findMasterEditionPda(
                collection.publicKey,
              )[0])
            },
          ),
        ]
      : [];

  const verifyCreatorIxs = filterNullLike(
    creators?.map((c) => {
      if (!c.authority) return;
      return verifyCreatorV1(
        defaultUmi,
        {
          metadata: publicKey(metadata),
          authority: createNoopSigner(publicKey(c.authority.publicKey)),
        },
      );
    }) ?? [],
  );

  // --------------------------------------- send

  await buildAndSendTx({
    conn,
    payer,
    ixs: [createIx, mintIx, ...verifyCollIxs.map((builder) => builder.getInstructions()).flat(), ...verifyCreatorIxs.map((builder) => builder.getInstructions()).flat()].map((instruction) => {
      return {
        keys: instruction.keys.map((meta) => {
          return {
            ...meta,
            pubkey: new PublicKey(meta.pubkey),
          }
        }),
        programId: new PublicKey(instruction.programId),
        data: Buffer.from(instruction.data),
      }
    }),
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
}): Promise<Partial<Awaited<ReturnType<typeof createAndFundAta>>> & {
  otherAta: PublicKey;
}>  => {
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
