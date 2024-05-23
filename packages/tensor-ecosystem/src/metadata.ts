export type Attribute = {
  trait_type: string;
  value: string;
};

export type AttributeCamelCase = {
  traitType: string;
  value: string;
};

/** returns true if content can't change for a given url */
export const hasFixedContentAddress = (uri: string): boolean => {
  // NB: Shadow Drive is NOT content addressable.
  const fixedSources = [
    'nftstorage.link',
    'arweave.net',
    'mypinata.cloud',
    'dweb.link',
    'ipfs.io',
  ];
  return fixedSources.some((s) => uri.includes(s));
};
