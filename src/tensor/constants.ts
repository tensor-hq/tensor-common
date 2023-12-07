import { PublicKey } from '@solana/web3.js';

// (!) KEEP IN SYNC WIHT RESPECTIVE PROTOCOLS

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
export const TDROP_PROGRAM_ID = new PublicKey(
  'TDRoPy8i5G8AMzuaGPb98fxDRevS81kfhVeaipyWGbN',
);
export const TGARD_PROGRAM_ID = new PublicKey(
  'TGARDaEzs7px1tEUssCCZ9ewhTW7oCA1MnY5y7rQk9n',
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

export const TSWAP_CORE_LUT = new PublicKey(
  '9Ses4wW9Mj3nemRJmcZgF81RgLENC6yGUFiMQBPDp5Uk',
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

// --------------------------------------- tlock

export const TLOCK_PDA_ADDR = PublicKey.findProgramAddressSync(
  [],
  TLOCK_PROGRAM_ID,
)[0];
