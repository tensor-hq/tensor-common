import { PublicKey } from '@solana/web3.js';

// (!) KEEP IN SYNC WITH RESPECTIVE PROTOCOLS

// --------------------------------------- program IDs

export const TSWAP_PROGRAM_ID = new PublicKey(
  'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
);
export const TLIST_PROGRAM_ID = new PublicKey(
  'TL1ST2iRBzuGTqLn1KXnGdSnEow62BzPnGiqyRXhWtW',
);
export const TBID_PROGRAM_ID = new PublicKey(
  'TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv',
);
export const TCOMP_PROGRAM_ID = new PublicKey(
  'TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp',
);
export const TSTKE_PROGRAM_ID = new PublicKey(
  'TSTKEiz9sqJRypokAkRhaW29rnDYDSxqWxmdv9brkp2',
);
export const SWAPSORIAN_PROGRAM_ID = new PublicKey(
  'SWPhxKY7ponWjkfYCnvWypX8pEMe9hvQHhKo9wS7vim',
);
export const TROLL_PROGRAM_ID = new PublicKey(
  'TRoLL7U1qTaqv2FFQ4jneZx5SetannKmrYCR778AkQZ',
);
export const TLOCK_PROGRAM_ID = new PublicKey(
  'TLoCKic2wGJm7VhZKumih4Lc35fUhYqVMgA4j389Buk',
);

export const TDROP_PROGRAM_ID = new PublicKey(
  'TDRoPy8i5G8AMzuaGPb98fxDRevS81kfhVeaipyWGbN',
);
export const TGARD_PROGRAM_ID = new PublicKey(
  'TGARDaEzs7px1tEUssCCZ9ewhTW7oCA1MnY5y7rQk9n',
);
export const TPAIR_PROGRAM_ID = new PublicKey(
  'TPA1R3GSAgUcZRcJXz5EU8Z7Y7w9XxoXz5fguY3anvM',
);

// --------------------------------------- address lookup table

export const TENSOR_LUT_ADDR = new PublicKey(
  '4NYENhRXdSq1ek7mvJyzMUvdn2aN3JeAr6huzfL7869j',
);

// Differs due to a recent slot being used in the derivation path.
export const TENSOR_LUT_DEVNET_ADDR = new PublicKey(
  '5z3YFrEgVqoTG8Eq1oCBggWSpLzTrofbsZBuytJTvUy6',
);

// --------------------------------------- tswap

export const TSWAP_PDA_ADDR = PublicKey.findProgramAddressSync(
  [],
  TSWAP_PROGRAM_ID,
)[0];

export const TSWAP_COSIGNER = new PublicKey(
  '6WQvG9Z6D1NZM76Ljz3WjgR7gGXRBJohHASdQxXyKi8q',
);

export const TSWAP_OWNER = new PublicKey(
  '99cmWwQMqMFzMPx85rvZYKwusGSjZUDsu6mqYV4iisiz',
);

// --------------------------------------- tlist

export const TLIST_COSIGNER = new PublicKey(
  '5aB7nyNJTuQZdKnhZXQHNhT16tBNevCuLRp14btvANxu',
);

export const TLIST_OWNER = new PublicKey(
  '99cmWwQMqMFzMPx85rvZYKwusGSjZUDsu6mqYV4iisiz',
);

// --------------------------------------- tcomp

export const TCOMP_PDA_ADDR = PublicKey.findProgramAddressSync(
  [],
  TCOMP_PROGRAM_ID,
)[0];

export const TCOMP_TRAIT_BID_COSIGNER = new PublicKey(
  '2C1skPhbfCW4q91WBEnbxuwEz4JBLtBwfmLXL1Wwy4MH',
);

export const GS_BROKER_ADDR = new PublicKey(
  '3g2nyraTXqEKke3sTtZw9JtfjCo8Hzw6qhKe8K2hrYuf',
);

export const BROKER_ADDRS = [TCOMP_PDA_ADDR, GS_BROKER_ADDR];

// --------------------------------------- troll

export const TROLL_TREASURY_ADDR = new PublicKey(
  'HATUHhpGy5moXuwTZKr1qZREmKANcLy3kRiMQZvUseLE',
);

export const TROLL_COSIGNER_ADDR = new PublicKey(
  '5qGy8rknMjt1S6V2YMGVidtuHpj1BVs6chzpjCDb47sB',
);

export const TROLL_WITHDRAW_COSIGNER_ADDR = new PublicKey(
  'C6v1Mb5K9gV1c7iYjEP5YWfQ2VLh1wjkmZ7bA3cJdKP8',
);

// --------------------------------------- tlock

export const TLOCK_PDA_ADDR = PublicKey.findProgramAddressSync(
  [],
  TLOCK_PROGRAM_ID,
)[0];

// --------------------------------------- SPL currencies

export const USDC_ADDR = new PublicKey(
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
);

export const CURRENCY_ADDRS = [USDC_ADDR];
