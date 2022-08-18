export const ME_AH_ADDRESS = 'E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe';
export const ME_PROGRAM = 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K';
export const ME_URL = 'https://api-mainnet.magiceden.dev';
export const makeMEHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
});

// Array of uint8s.
export type METxSigned = number[];
