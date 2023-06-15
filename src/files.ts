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
