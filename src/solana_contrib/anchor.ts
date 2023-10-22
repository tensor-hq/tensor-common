import {
  BorshCoder,
  Event,
  EventParser,
  Idl,
  Instruction,
  Program,
  Wallet,
  utils,
} from '@coral-xyz/anchor';
import { InstructionDisplay } from '@coral-xyz/anchor/dist/cjs/coder/borsh/instruction';
import { AllAccountsMap } from '@coral-xyz/anchor/dist/cjs/program/namespace/types';
import {
  AccountInfo,
  Keypair,
  PublicKey,
  TransactionResponse,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { ExtractedIx, extractAllIxs } from './transaction';

export const dummyWallet = () => new Wallet(Keypair.generate());

type Decoder = (buffer: Buffer) => any;
export type AnchorDiscMap<IDL extends Idl> = Record<
  string,
  { decoder: Decoder; name: keyof AllAccountsMap<IDL> }
>;

export type AnchorIxName<IDL extends Idl> = IDL['instructions'][number]['name'];
export type AnchorIx<IDL extends Idl> = Omit<Instruction, 'name'> & {
  name: AnchorIxName<IDL>;
};
export type ParsedAnchorEvent<IDL extends Idl> = {
  ixName: string | null;
  /** Increments every time a new invocation of a program ix happens. */
  ixSeq: number;
  event: AnchorEvent<IDL>;
};
export type AnchorEvent<
  IDL extends Idl,
  Events = IDL['events'],
> = Events extends any[] ? Event<Events[number]> : undefined;
export type ParsedAnchorIx<IDL extends Idl> = {
  ix: AnchorIx<IDL>;
  events: ParsedAnchorEvent<IDL>[];
  /// FYI: accounts under InstructionDisplay is the space-separated capitalized
  /// version of the fields for the corresponding #[Accounts].
  /// eg sol_escrow -> "Sol Escrow', or tswap -> "Tswap"
  formatted: InstructionDisplay | null;
  /// Needed to be able to figure out correct programs for sub-ixs
  accountKeys: PublicKey[];
} & Pick<ExtractedIx, 'ixIdx' | 'innerIxs' | 'noopIxs'>;

export type ParsedAnchorAccount = InstructionDisplay['accounts'][number];

// =============== Decode accounts ===============

export const genDiscToDecoderMap = <IDL extends Idl>(
  program: Program<IDL>,
): AnchorDiscMap<IDL> => {
  return Object.fromEntries(
    program.idl.accounts?.map((acc) => {
      const name = acc.name as keyof AllAccountsMap<IDL>;
      const capName = name.at(0)!.toUpperCase() + name.slice(1);

      return [
        utils.sha256.hash(`account:${capName}`).slice(0, 8),
        {
          decoder: (buffer: Buffer) =>
            program.coder.accounts.decode(name, buffer),
          name,
        },
      ];
    }) ?? [],
  );
};

export const decodeAnchorAcct = <IDL extends Idl>(
  acct: AccountInfo<Buffer>,
  discMap: AnchorDiscMap<IDL>,
) => {
  const disc = acct.data.toString('hex').slice(0, 8);
  const meta = discMap[disc];
  if (!meta) return null;

  return {
    name: meta.name,
    account: meta.decoder(acct.data),
  };
};

// =============== END Decode accounts ===============

export const genIxDiscHexMap = <IDL extends Idl>(
  idl: IDL,
): Record<AnchorIxName<IDL>, string> => {
  return Object.fromEntries(
    idl.instructions.map((ix) => {
      const name = ix.name;
      const snakeCaseName = name.replaceAll(/([A-Z])/g, '_$1').toLowerCase();

      return [name, utils.sha256.hash(`global:${snakeCaseName}`).slice(0, 16)];
    }),
  ) as Record<AnchorIxName<IDL>, string>;
};

export const getIxDiscHex = (bs58Data: string): string =>
  Buffer.from(bs58.decode(bs58Data)).toString('hex').slice(0, 16);

// =============== Parse ixs/events ===============

const invokeRegex = /^Program ([A-Za-z0-9]{32,44}) invoke \[\d+\]$/;
const ixNameRegex = /^Program log: Instruction: ([A-Za-z0-9]+)$/;
const eventRegex = /^Program data:/;

/// Adapted from https://github.com/saber-hq/saber-common/blob/4b533d77af8ad5c26f033fd5e69bace96b0e1840/packages/anchor-contrib/src/utils/coder.ts#L171-L185
export const parseAnchorEvents = <IDL extends Idl>(
  eventParser: EventParser,
  programId: PublicKey,
  logs: string[] | undefined | null,
): ParsedAnchorEvent<IDL>[] => {
  if (!logs) {
    return [];
  }
  const parsedLogsIter = eventParser.parseLogs(logs);
  let parsedEvent = parsedLogsIter.next();

  let latestIxName: string | null = null;
  let ixSeq = -1;
  const events: ParsedAnchorEvent<IDL>[] = [];
  for (let idx = 0; idx < logs.length; idx++) {
    const invokeMatch = logs[idx].match(invokeRegex);
    if (invokeMatch?.at(1) === programId.toBase58()) {
      idx++;
      const instrMatch = logs.at(idx)?.match(ixNameRegex);
      if (instrMatch?.at(1)) {
        // Lower case this so it matches what ix decoder gives back.
        latestIxName =
          instrMatch[1].at(0)!.toLowerCase() + instrMatch[1].slice(1);
        ixSeq++;
        idx++;
      }
    }
    if (idx >= logs.length) continue;
    if (!logs[idx].match(eventRegex)) continue;

    if (!parsedEvent.done) {
      events.push({
        ixName: latestIxName,
        ixSeq,
        event: parsedEvent.value as AnchorEvent<IDL>,
      });
      parsedEvent = parsedLogsIter.next();
    }
  }

  return events;
};

export const parseAnchorIxs = <IDL extends Idl>({
  coder,
  tx,
  programId,
  noopIxDiscHex,
  eventParser,
}: {
  coder: BorshCoder;
  tx: TransactionResponse;
  programId: PublicKey;
  noopIxDiscHex?: string;
  /// If provided, will try to parse events.
  /// Do not initialize if there are no events defined!
  eventParser?: EventParser;
}): ParsedAnchorIx<IDL>[] => {
  const message = tx.transaction.message;
  const logs = tx.meta?.logMessages;
  const allEvents = eventParser
    ? parseAnchorEvents<IDL>(eventParser, programId, logs)
    : [];

  let eventsIdx = 0;
  const ixs: ParsedAnchorIx<IDL>[] = [];
  extractAllIxs({ tx, programId, noopIxDiscHex }).forEach(
    ({ rawIx, ixIdx, innerIxs, noopIxs }) => {
      // Instruction data.
      const ix = coder.instruction.decode(rawIx.data, 'base58');
      if (!ix) return;
      const accountMetas = rawIx.accounts.map((acctIdx) => {
        const pubkey = message.accountKeys[acctIdx];
        return {
          pubkey,
          isSigner: message.isAccountSigner(acctIdx),
          isWritable: message.isAccountWritable(acctIdx),
        };
      });

      // Match events (if any).
      const events: ParsedAnchorEvent<IDL>[] = [];
      if (allEvents.at(eventsIdx)?.ixName === ix.name) {
        let ixSeq = allEvents[eventsIdx].ixSeq;
        while (allEvents.at(eventsIdx)?.ixSeq === ixSeq) {
          events.push(allEvents[eventsIdx]);
          eventsIdx++;
        }
      }

      try {
        const formatted = coder.instruction.format(ix, accountMetas);
        ixs.push({
          ixIdx,
          ix,
          innerIxs,
          noopIxs,
          events,
          formatted,
          accountKeys: message.accountKeys,
        });
      } catch (err: any) {
        // Catch any ixs whose arg data can't be decoded (eg complex self-noop ixs).
        if (err.message === 'Unable to find variant') return;
        throw err;
      }
    },
  );

  return ixs;
};
// =============== END Parse ixs/events ===============
