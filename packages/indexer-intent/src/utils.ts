import dayjs from 'dayjs';

// timestamp to date
export function readableTimestamp(timestamp: bigint): string {
  const date = dayjs.unix(Number(timestamp)).format('YYYY-MM-DD HH:mm:ss');
  return date;
}
