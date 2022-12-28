// th, st, nd, rd is for degenfatcats
const _nameIndexRegex = new RegExp('(\\d+)(th|st|nd|rd)?$');

export const tryGetNftShortName = (name: string): string => {
  const shortName = _nameIndexRegex.exec(name);
  if (shortName?.length) {
    return '#' + shortName[1];
  }
  return name;
};

export const tryGetNftCollName = (name: string) => {
  // const shortName = name!.matchAll(/(\d+)(th)?$/g);
  const shortName = _nameIndexRegex.exec(name);
  if (shortName?.length) {
    const suffix = shortName[1].length;
    return name.slice(0, -suffix).replaceAll('#', '');
  }
  return name;
};
