import * as yup from 'yup';
import { PublicKey } from '@solana/web3.js';
import { hashlistToPublicKeys } from '.';

// Redeclare prisma enums here. If a prisma enum field ends up in a tRPC interface, the field will be missing on the client side
export enum CreatorIdentifyMode {
  VOC = 'VOC',
  FVC = 'FVC',
  HASHLIST = 'HASHLIST',
}
export const creatorIdentifyMode: readonly CreatorIdentifyMode[] =
  Object.values(CreatorIdentifyMode);

export enum CreatorReviewStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
}
export const creatorReviewStatus: readonly CreatorReviewStatus[] =
  Object.values(CreatorReviewStatus);

export enum CollectionCategory {
  PFPS = 'PFPS',
  GAMING = 'GAMING',
  ART = 'ART',
  METAVERSE = 'METAVERSE',
  MUSIC = 'MUSIC',
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  SPORTS = 'SPORTS',
  DOMAIN_NAMES = 'DOMAIN_NAMES',
  UTILITY = 'UTILITY',
  OTHER = 'OTHER',
}
export const collectionCategory: readonly CollectionCategory[] =
  Object.values(CollectionCategory);

export enum CreatorTeamRole {
  READ = 'READ',
  WRITE = 'WRITE',
  OWNER = 'OWNER',
}
export const creatorTeamRole: readonly CreatorTeamRole[] =
  Object.values(CreatorTeamRole);

export interface ReviewFormData {
  reviewStatus: CreatorReviewStatus;
  version: number;
  notes: {
    id: string | undefined;
    noteContent: string | undefined;
    noteUserVisible: boolean;
    username: string;
  }[];
  mintConflicts: MintConflict[];
  claimed: boolean;
  claimedByYou: boolean;
}

export interface MintConflict {
  slug: string;
  slugDisplay: string | null;
  secured: boolean;
  mint?: string;
  voc?: string;
  fvc?: string;
}

export interface HaveYouMintedFormData {
  listedOnTensor: boolean | null;
  collectionId: string | null;
  haveYouMinted: boolean | null;
  estimatedSupply: number | null;
}

export interface IdentifyCollectionFormData {
  identifyMode: CreatorIdentifyMode | null;
  voc: string[];
  fvc: string[];
  hashlist: string;
}

export interface PopulateDetailsFormData {
  name: string;
  slugDisplay: string;
  symbol: string;
  description: string;
  twitter: string;
  discord: string;
  website: string | undefined;
  categories: CollectionCategory[];
  explicitContent: boolean;
  estimatedMintDate: string | undefined;
}

export type EditFormData = HaveYouMintedFormData &
  IdentifyCollectionFormData &
  PopulateDetailsFormData &
  ReviewFormData;

/** Alphanumberic and underscore strings only */
export const getSlugSchema = () =>
  yup
    .string()
    .test(
      'isValidSlug',
      'Only letters, numbers and underscores are allowed',
      (value) => {
        if (!value) {
          return true;
        }

        // Regexp:
        // a to z
        // A to Z
        // 0 to 9
        // '_'
        return /^[a-zA-Z0-9_]+$/.test(value);
      },
    );

/** Uppercase A-Z alphabet only */
export const getSymbolSchema = () => {
  return yup
    .string()
    .test('isValidSymbol', 'Only letters are allowed', (value) => {
      if (!value) {
        return true;
      }

      // Regexp:
      // A to Z
      // Allow lowercase because chakra textTransform will store
      // the underlying value how the user typed it
      return /^[a-zA-Z]+$/.test(value);
    });
};

/** Any string except carriage returns */
export const getNoNewlineSchema = () => {
  return yup
    .string()
    .test('isNoNewline', 'New lines are not allowed', (value) => {
      if (!value) {
        return true;
      }

      // Regexp: Contains new lines
      return !/\r|\n/.test(value);
    });
};

export const getPublicKeySchema = () =>
  yup.string().test('isValidPublicKey', 'Invalid public key', (value) => {
    if (!value) {
      return true;
    }

    try {
      new PublicKey(value);
      return true;
    } catch (err: unknown) {
      return false;
    }
  });

export const getHashlistSchema = () =>
  yup.string().test('isValidHashlist', (value, testContext) => {
    if (!value) {
      return true;
    }

    const { errors } = hashlistToPublicKeys(value);
    if (errors) {
      return testContext.createError({ message: errors });
    }

    return true;
  });

/**
 * Max array lengths for all Identify Collection fields.
 */
export const identifyCollectionSchemaLengths: Record<
  keyof Omit<IdentifyCollectionFormData, 'identifyMode'>,
  number
> = {
  voc: 1,
  fvc: 1,
  hashlist: 1_250_000,
};

/**
 * Max string lengths for all Populate Details fields. Synchronize with database
 */
export const populateDetailsSchemaLengths: Record<
  keyof Omit<
    PopulateDetailsFormData,
    'categories' | 'explicitContent' | 'estimatedMintDate'
  >,
  number
> = {
  name: 40,
  slugDisplay: 20,
  symbol: 10,
  description: 500,
  twitter: 64,
  discord: 64,
  website: 64,
};

export const getReviewFormSchema = () => {
  const schema: yup.ObjectSchema<ReviewFormData> = yup.object({
    reviewStatus: yup
      .mixed<CreatorReviewStatus>()
      .oneOf(creatorReviewStatus)
      .required(),
    version: yup.number().integer().min(1).required(),
    notes: yup
      .array(
        yup.object({
          id: yup.string().uuid(),
          noteContent: yup.string().max(500),
          noteUserVisible: yup.boolean().required(),
          username: yup.string(),
        }) as yup.Schema<ReviewFormData['notes'][number]>,
      )
      .required(),
    mintConflicts: yup
      .array(
        yup.object({
          slug: yup.string().required(),
          slugDisplay: yup.string().nullable().required(),
          secured: yup.boolean().required(),
          mint: getPublicKeySchema().optional(),
          voc: getPublicKeySchema().optional(),
          fvc: yup.string().optional(),
        }),
      )
      .required(),
    claimed: yup.boolean().required(),
    claimedByYou: yup.boolean().required(),
  });
  return schema;
};

export const getHaveYouMintedFormSchema = () => {
  const schema: yup.ObjectSchema<HaveYouMintedFormData> = yup.object({
    listedOnTensor: yup.boolean().required() as yup.BooleanSchema<
      boolean | null
    >,
    collectionId: yup
      .string()
      .uuid()
      .when('listedOnTensor', {
        is: true,
        then: (schema) => schema.required(),
        otherwise: (schema) => schema.nullable(),
      }) as yup.StringSchema<string | null>,
    haveYouMinted: yup
      .boolean()
      .when('listedOnTensor', {
        is: false,
        then: (schema) => schema.required(),
      })
      .required(),
    estimatedSupply: yup
      .number()
      .integer()
      .min(1)
      .when('haveYouMinted', {
        is: false,
        then: (schema) => schema.required('Estimated supply is required'),
      }) as yup.NumberSchema<number | null>,
  });
  return schema;
};

export const getIdentifyCollectionFormSchema = () => {
  const schema: yup.ObjectSchema<IdentifyCollectionFormData> = yup.object({
    identifyMode: yup
      .mixed<CreatorIdentifyMode>()
      .nullable()
      .oneOf(creatorIdentifyMode)
      .when('haveYouMinted', {
        is: true,
        then: (schema) =>
          schema.required('Please choose an identification method'),
      }) as yup.MixedSchema<CreatorIdentifyMode | null>,
    voc: yup
      .array()
      .when('identifyMode', {
        is: 'VOC',
        then: (schema) =>
          yup
            .array(
              getPublicKeySchema().required(
                'Metaplex certified collection is required',
              ),
            )
            .min(1),
      })
      .max(identifyCollectionSchemaLengths.voc)
      .required(),
    fvc: yup
      .array()
      .when('identifyMode', {
        is: 'FVC',
        then: (schema) =>
          yup
            .array(
              getPublicKeySchema().required(
                'First verified creator is required',
              ),
            )
            .min(1),
      })
      .max(identifyCollectionSchemaLengths.fvc)
      .required(),
    hashlist: yup
      .string()
      .when('identifyMode', {
        is: 'HASHLIST',
        then: (schema) =>
          getHashlistSchema().required('A collection hashlist is required'),
      })
      .max(
        identifyCollectionSchemaLengths.hashlist,
      ) as yup.StringSchema<string>,
  });
  return schema;
};

export const getPopulateDetailsFormSchema = () => {
  const schema: yup.ObjectSchema<PopulateDetailsFormData> = yup.object({
    name: yup
      .string()
      .min(3)
      .max(populateDetailsSchemaLengths.name)
      .required('Collection name is required'),
    slugDisplay: getSlugSchema()
      .min(3)
      .max(populateDetailsSchemaLengths.slugDisplay)
      .required('Url slug is required'),
    symbol: getSymbolSchema()
      .min(1)
      .max(populateDetailsSchemaLengths.symbol)
      .required('Collection symbol is required'),
    description: getNoNewlineSchema()
      .max(populateDetailsSchemaLengths.description)
      .required('Description is required'),
    twitter: yup
      .string()
      .max(populateDetailsSchemaLengths.twitter)
      .required('Linking a Twitter account is required'),
    discord: yup
      .string()
      .max(populateDetailsSchemaLengths.discord) as yup.StringSchema<string>,
    website: yup
      .string()
      .max(populateDetailsSchemaLengths.website) as yup.StringSchema<string>,
    categories: yup
      .array(
        yup
          .mixed<CollectionCategory>()
          .oneOf(collectionCategory)
          .required('Category is required'),
      )
      .length(1, 'Category is required')
      .required('Category is required'),
    explicitContent: yup.boolean().required(),
    estimatedMintDate: yup.string().nullable() as yup.StringSchema<
      string | undefined
    >,
  });
  return schema;
};

export const getEditFormSchema = () => {
  const schema: yup.ObjectSchema<EditFormData> = getReviewFormSchema()
    .concat(getHaveYouMintedFormSchema())
    .concat(getIdentifyCollectionFormSchema())
    .concat(getPopulateDetailsFormSchema()) as yup.ObjectSchema<EditFormData>;
  return schema;
};
