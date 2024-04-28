export const SECONDS = 1000;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;
export const DAYS = 24 * HOURS;
export const YEARS = 365.25 * DAYS;

export interface Timespan {
  Millis?: number;
  Seconds?: number;
  Minutes?: number;
  Hours?: number;
  Days?: number;
}

const totalMS = (time: Timespan): number => {
  const millis = time.Millis || 0;
  const seconds = time.Seconds || 0;
  const minutes = time.Minutes || 0;
  const hours = time.Hours || 0;
  const days = time.Days || 0;
  return (
    millis + SECONDS * seconds + MINUTES * minutes + HOURS * hours + DAYS * days
  );
};

export const sleep = (time: Timespan): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, totalMS(time)));
};

export const waitMS = async (ms: number): Promise<void> =>
  sleep({ Millis: ms });

export const truncateTime = (date: Date): Date => {
  const timePortion = date.getTime() % DAYS;
  return new Date(date.getTime() - timePortion);
};

export const addTime = (date: Date | number, time: Timespan): Date => {
  return new Date(new Date(date).getTime() + totalMS(time));
};

export const calcNumDays = (start: number, end: number): number => {
  const difference = new Date(start).getTime() - new Date(end).getTime();
  return Math.ceil(difference / (1000 * 3600 * 24));
};

export const dateYYYYMMDD = (date: Date): string => {
  return `${date.getFullYear()}${('0' + (date.getMonth() + 1)).slice(-2)}${(
    '0' + date.getDate()
  ).slice(-2)}`;
};
