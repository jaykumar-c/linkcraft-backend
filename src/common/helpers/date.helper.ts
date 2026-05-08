import moment from 'moment';

/**
 * Returns the current time in Unix seconds (bigint).
 */
export const getCurrentTimestampSeconds = (): number => {
  return moment().unix();
};

/**
 * Returns the current time in Unix milliseconds.
 */
export const getCurrentTimestampMs = (): number => {
  return moment().valueOf();
};

/**
 * Formats a given timestamp or current time.
 */
export const formatDate = (
  date?: Date | number | string,
  format: string = 'YYYY-MM-DD HH:mm:ss',
): string => {
  return moment(date).format(format);
};
