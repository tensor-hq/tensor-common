import {
  BorshCoder,
  Event,
  EventParser,
  Idl,
  Instruction,
  Program,
  utils,
} from '@project-serum/anchor';
import { InstructionDisplay } from '@project-serum/anchor/dist/cjs/coder/borsh/instruction';
import { AllAccountsMap } from '@project-serum/anchor/dist/cjs/program/namespace/types';
import {
  AccountInfo,
  CompiledInnerInstruction,
  PublicKey,
  TransactionResponse,
} from '@solana/web3.js';
import { extractAllIxs } from './transaction';

type Decoder = (buffer: Buffer) => any;
export type AnchorDiscMap<IDL extends Idl> = Record<
  string,
  { decoder: Decoder; name: keyof AllAccountsMap<IDL> }
>;

export type AnchorIxName<IDL extends Idl> = IDL['instructions'][number]['name'];
export type AnchorIx<IDL extends Idl> = Omit<Instruction, 'name'> & {
  name: AnchorIxName<IDL>;
};
export type AnchorEvent<
  IDL extends Idl,
  Events = IDL['events'],
> = Events extends any[] ? Event<Events[number]> : undefined;
export type ParsedAnchorIx<IDL extends Idl> = {
  /// Index of top-level instruction.
  ixIdx: number;
  ix: AnchorIx<IDL>;
  /// Presence of field = it's a top-level ix; absence = inner ix itself.
  innerIxs?: CompiledInnerInstruction[];
  events: AnchorEvent<IDL>[];
  /// FYI: accounts under InstructionDisplay is the space-separated capitalized
  /// version of the fields for the corresponding #[Accounts].
  /// eg sol_escrow -> "Sol Escrow', or tswap -> "Tswap"
  formatted: InstructionDisplay | null;
};

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

// =============== Parse ixs/events ===============

/// Stolen from https://github.com/saber-hq/saber-common/blob/4b533d77af8ad5c26f033fd5e69bace96b0e1840/packages/anchor-contrib/src/utils/coder.ts#L171-L185
export const parseAnchorEvents = <IDL extends Idl>(
  eventParser: EventParser,
  logs: string[] | undefined | null,
): AnchorEvent<IDL>[] => {
  if (!logs) {
    return [];
  }

  const events: AnchorEvent<IDL>[] = [];
  const parsedLogsIter = eventParser.parseLogs(logs ?? []);
  let parsedEvent = parsedLogsIter.next();
  while (!parsedEvent.done) {
    events.push(parsedEvent.value as AnchorEvent<IDL>);
    parsedEvent = parsedLogsIter.next();
  }

  return events;
};

export const parseAnchorIxs = <IDL extends Idl>({
  coder,
  tx,
  eventParser,
  programId,
}: {
  coder: BorshCoder;
  tx: TransactionResponse;
  /// If provided, will try to parse events.
  /// Do not initialize if there are no events defined!
  eventParser?: EventParser;
  /// If passed, will only process ixs w/ this program ID.
  programId?: PublicKey;
}): ParsedAnchorIx<IDL>[] => {
  const message = tx.transaction.message;
  const logs = tx.meta?.logMessages;

  const ixs: ParsedAnchorIx<IDL>[] = [];
  extractAllIxs(tx, programId).forEach(({ rawIx, ixIdx, innerIxs }) => {
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
    const formatted = coder.instruction.format(ix, accountMetas);

    // Events data.
    // TODO: partition events properly by ix.
    const events = eventParser ? parseAnchorEvents<IDL>(eventParser, logs) : [];
    ixs.push({ ixIdx, ix, innerIxs, events, formatted });
  });

  return ixs;
};

// =============== END Parse ixs/events ===============
