export const isImageFile = (filename: string): boolean =>
  ['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(
    filename.substring(filename.lastIndexOf('.')).toLowerCase(),
  );

export const isVideoFile = (filename: string): boolean =>
  ['.mp4', '.avi', '.mov', '.mkv'].includes(
    filename.substring(filename.lastIndexOf('.')).toLowerCase(),
  );

export const isGifFile = (filename: string): boolean =>
  ['.gif'].includes(
    filename.substring(filename.lastIndexOf('.')).toLowerCase(),
  );

export const isImageOrVideoOrGifFile = (filename: string): boolean =>
  isImageFile(filename) || isVideoFile(filename) || isGifFile(filename);

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
