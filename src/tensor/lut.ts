import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '@solana/spl-account-compression';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';
import {
  AUTH_PROGRAM_ID,
  BUBBLEGUM_PROGRAM_ID,
  TMETA_PROGRAM_ID,
} from '../metaplex';
import {
  BROKER_ADDRS,
  CURRENCY_ADDRS,
  SWAPSORIAN_PROGRAM_ID,
  TBID_PROGRAM_ID,
  TCOMP_PROGRAM_ID,
  TDROP_PROGRAM_ID,
  TGARD_PROGRAM_ID,
  TLIST_PROGRAM_ID,
  TLOCK_PDA_ADDR,
  TLOCK_PROGRAM_ID,
  TROLL_PROGRAM_ID,
  TROLL_TREASURY_ADDR,
  TSTKE_PROGRAM_ID,
  TSWAP_PDA_ADDR,
  TSWAP_PROGRAM_ID,
} from './constants';
import { HADESWAP_ADDR } from '../programs/hadeswap/constants';
import { findAta } from '../solana_contrib/spl_token';

const BROKER_CURRENCY_ATAS = BROKER_ADDRS.flatMap((broker) =>
  CURRENCY_ADDRS.map((currency) => findAta(currency, broker)),
);

export const TENSOR_LUT_STORED_ADDRS: PublicKey[] = [
  //compression
  SPL_NOOP_PROGRAM_ID,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  //solana
  SystemProgram.programId,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ComputeBudgetProgram.programId,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  //hade
  HADESWAP_ADDR,
  //mplex
  BUBBLEGUM_PROGRAM_ID,
  AUTH_PROGRAM_ID,
  TMETA_PROGRAM_ID,
  //tensor
  TSWAP_PROGRAM_ID,
  TLIST_PROGRAM_ID,
  TBID_PROGRAM_ID,
  TCOMP_PROGRAM_ID,
  TDROP_PROGRAM_ID,
  TGARD_PROGRAM_ID,
  TSTKE_PROGRAM_ID,
  SWAPSORIAN_PROGRAM_ID,
  TROLL_PROGRAM_ID,
  TLOCK_PROGRAM_ID,
  TSWAP_PDA_ADDR,
  TLOCK_PDA_ADDR,
  TROLL_TREASURY_ADDR,
  ...BROKER_ADDRS,
  ...CURRENCY_ADDRS,
  ...BROKER_CURRENCY_ATAS,

  ...[
    // legacy addresses carried over from a previous TCOMP lut
    'GNsnin9c2nDGp78E69tGXyMScWfysnu2PuxQxXy1jh3R',
    'FmXTDjK4sKciGwxomWMh7bRjGuYfrmHKLhCvDp67ihBg',
    'CVB1bV8dd5gEktXrP6cEvfVjuNnieQADGomWvdv8Yh1n',
    '4FZcSBJkhPeNAkXecmKnnqHy93ABWzi3Q5u9eXkUfxVE',
    'ChnQncYtNLwVsCg52bDEYwE2GTF4i6bvu7QPYbkXQdPi',
    'hpjcd2qA2T1D1dtrNjD1RuDL2Ej3iSLWq6xo5fMiiwT',
    'EevH3LPRexR2431NSF6bCpBbPdQ2ViHbM1p84zujiEUs',
    'D3pBAQAtRhWZyM9a5sakjEgpq2NUiZ8eYzHFvYmE5QL4',
    '4NxSi99mo5hj3BZP6kxWVPgL6skwW6264YNn4LP3X8ML',
    'Epibg5k2XyjNaLzp7STDg9KLvvjvw4msE1xnfobTT6T5',
    '6pZYD8qi7g8XT8pPg8L6NJs2znZkQ4CoPjTz6xqwnBWg',
    'BKm9PzXaE65pimbsJt7ahFfUaw59TBC5TZk27iDDphVj',
    '2u9fRJC8Qog3F2AGo7hxjcTUmAYN3MFfmQ7ZfUkUkKBG',
    'DRiPPP2LytGjNZ5fVpdZS7Xi1oANSY3Df1gSxvUKpzny',
    'WoMbXFtdfH8crq2Zi7bQhfGx2Gv8EN4saP13gcdUGog',
    'ETpYR6oTe4mgFqAqn2YDRkwmJFvCZezcpfYisxuyM9VG',
    '28K4n3AZe2nJ7yNgRbfAcaEppq2N9zi2Sdu8BoP4qzFD',
    'AQCwvz5oCrtCsxPwBDqaaFX6EuGBhk1kf6G6Pehrhvb1',
    '5i1rrMFvFfwCkR15cf66bEXM2LmtfffDfYegQ3qdWgcF',
    'qzKzA7R24pWnuFcv6sHCTv2NKn1raG2fbL7bpgipJP5',
    '4gcgGDUqyUQZRzA3MDKGAJARq8qzUpeJ4NMsHtPngjxM',
    '2NWzJhPV6yNs36fEXSjnXQuVaMtFWRKxM2LepdhjZwUm',
    '2C1skPhbfCW4q91WBEnbxuwEz4JBLtBwfmLXL1Wwy4MH',
    '5qGy8rknMjt1S6V2YMGVidtuHpj1BVs6chzpjCDb47sB',
    'C6v1Mb5K9gV1c7iYjEP5YWfQ2VLh1wjkmZ7bA3cJdKP8',
  ].map((addr) => new PublicKey(addr)),
];
