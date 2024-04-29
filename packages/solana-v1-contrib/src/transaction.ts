import {
  Blockhash,
  CompiledInstruction,
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  Connection,
  Finality,
  Message,
  MessageHeader,
  MessageV0,
  Transaction,
  TransactionInstruction,
  TransactionResponse,
  VersionedTransaction,
  VersionedTransactionResponse,
} from '@solana/web3.js';
import { Maybe, Overwrite } from '@tensor-hq/ts-utils';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

export type TransactionMessageJSON = {
  header: MessageHeader;
  accountKeys: string[];
  recentBlockhash: Blockhash;
  instructions: CompiledInstruction[];
};

export type TransactionJSON = Overwrite<
  TransactionResponse['transaction'],
  {
    message: TransactionMessageJSON;
  }
>;

export type TransactionResponseJSON = Overwrite<
  TransactionResponse,
  {
    transaction: TransactionJSON;
  }
>;

export type TransactionResponseLoadedAddresses = {
  v0LoadedAddresses?: {
    numWritableAccounts: number;
    numReadonlyAccounts: number;
  };
};

export type TransactionResponseAugmented = TransactionResponse &
  TransactionResponseLoadedAddresses;

export type TransactionResponseAugmentedJSON = Overwrite<
  TransactionResponseAugmented,
  {
    transaction: TransactionJSON;
  }
>;

export const castTxResponseJSON = <T extends TransactionResponse>(
  tx: T,
): Overwrite<T, { transaction: TransactionJSON }> => {
  return {
    ...tx,
    transaction: {
      ...tx.transaction,
      message: castMessageJSON(tx.transaction.message),
    },
  };
};

export const castTxResponse = <T extends TransactionResponseJSON>(
  tx: T,
): Overwrite<T, { transaction: TransactionResponse['transaction'] }> => {
  return {
    ...tx,
    transaction: {
      ...tx.transaction,
      message: new Message(tx.transaction.message),
    },
  };
};

export const castMessageJSON = (msg: Message): TransactionMessageJSON => {
  return {
    ...msg,
    accountKeys: msg.accountKeys.map((k) => k.toBase58()),
  };
};

// NB: use this o/w the getAccountKey fn on VersionedTransactionResponse from Geyser/RPC doesn't work...
export const getAccountKeys = (tx: VersionedTransactionResponse) => {
  return [
    ...(tx.transaction.message.staticAccountKeys ?? []),
    ...(tx.meta?.loadedAddresses?.writable ?? []),
    ...(tx.meta?.loadedAddresses?.readonly ?? []),
  ];
};

/** converts the new v0 tx type to legacy so that our downstream parser works as expected */
export const convertTxToLegacy = (
  tx: VersionedTransactionResponse & TransactionResponseLoadedAddresses,
): TransactionResponseAugmented => {
  // Okay this is really fucking weird, but here is the observed behavior:
  // JSON RPC getTransaction:
  // - legacy: in TransactionResponse format
  // - v0: in VersionedTransactionResponse format
  // Geyser SQS:
  // - legacy & v0 in VersionedTransactionResponse

  //handle TransactionResponse/legacy format, return as is
  if (
    (tx.version === undefined ||
      tx.version === null ||
      tx.version === 'legacy') &&
    !('compiledInstructions' in tx.transaction.message)
  ) {
    return tx as TransactionResponse;
  }
  //handle VersionedTransactionResponse
  const v0msg = tx.transaction.message as MessageV0;
  const legacyMsg = new Message({
    header: v0msg.header,
    accountKeys: getAccountKeys(tx),
    instructions: v0msg.compiledInstructions.map((i) => {
      const { accountKeyIndexes, ...rest } = i;
      return {
        ...rest,
        accounts: accountKeyIndexes,
        //when parsing a JSON file, this field is a stringified buffer ({type: Buffer, data: [1,2,3]})
        data:
          'data' in i.data
            ? bs58.encode(Uint8Array.from((i.data as any).data))
            : bs58.encode(i.data),
      };
    }),
    recentBlockhash: v0msg.recentBlockhash,
  });
  return {
    ...tx,
    meta: tx.meta
      ? {
          ...tx.meta,
          loadedAddresses: {
            readonly: [],
            writable: [],
          },
        }
      : null,
    transaction: {
      ...tx.transaction,
      message: legacyMsg,
    },
    v0LoadedAddresses: tx.v0LoadedAddresses ?? {
      numReadonlyAccounts: tx.meta?.loadedAddresses?.readonly?.length ?? 0,
      numWritableAccounts: tx.meta?.loadedAddresses?.writable?.length ?? 0,
    },
  };
};

/** gets new v0 and legacy transactions with the old TransactionResponse format */
export const getTransactionConvertedToLegacy = async (
  conn: Connection,
  sig: string,
  commitment: Finality = 'confirmed',
): Promise<TransactionResponse | null> => {
  const tx: VersionedTransactionResponse | null = await conn.getTransaction(
    sig,
    {
      commitment,
      maxSupportedTransactionVersion: 0,
    },
  );
  if (!tx) return null;
  return convertTxToLegacy(tx);
};

// Current max compute per tx.
export const MAX_COMPUTE_UNITS = 1_400_000;
/** Adds (1) increase compute + (2) priority fees */
export const prependComputeIxs = (
  ixs: TransactionInstruction[],
  compute?: Maybe<number>,
  priorityMicroLamports?: Maybe<number>,
): TransactionInstruction[] => {
  const out = [...ixs];
  if (
    compute &&
    !ixs.some(
      (ix) =>
        ix.programId.equals(ComputeBudgetProgram.programId) &&
        ComputeBudgetInstruction.decodeInstructionType(ix) ===
          'SetComputeUnitLimit',
    )
  ) {
    const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
      units: Math.min(MAX_COMPUTE_UNITS, compute),
    });
    out.splice(0, 0, modifyComputeUnits);
  }
  if (
    priorityMicroLamports &&
    !ixs.some(
      (ix) =>
        ix.programId.equals(ComputeBudgetProgram.programId) &&
        ComputeBudgetInstruction.decodeInstructionType(ix) ===
          'SetComputeUnitPrice',
    )
  ) {
    const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityMicroLamports,
    });
    out.splice(0, 0, addPriorityFee);
  }
  return out;
};

//Do NOT use Uint8Array as output, this would cause all kinds of serialization problems in graphql
export const serializeAnyVersionTx = (
  tx: Transaction | VersionedTransaction,
  verifySignatures = false,
): number[] => {
  if (tx instanceof Transaction) {
    return tx.serialize({ verifySignatures }).toJSON().data;
  } else if (tx instanceof VersionedTransaction) {
    //verify signatures = always false
    return Array.from(tx.serialize());
  } else {
    // This is to handle weird wallet adapters that don't return Transaction/VersionedTransaction objects.
    const unkTx = tx as any;
    try {
      return unkTx.serialize({ verifySignatures }).toJSON().data;
    } catch (err) {
      console.error(err);
      try {
        return Array.from(unkTx.serialize());
      } catch (err) {
        console.error(err);
        throw new Error('unknown tx type');
      }
    }
  }
};

export const legacyToV0Tx = (
  legacy: Buffer | Uint8Array | Array<number>,
): VersionedTransaction => {
  return new VersionedTransaction(Transaction.from(legacy).compileMessage());
};
