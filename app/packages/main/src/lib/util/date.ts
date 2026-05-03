import { padNumber } from "./numbers";

/**
 * Converts a Unix timestamp (seconds since epoch) to a human-readable date string.
 *
 * @param timestamp the Unix timestamp in seconds
 * @returns a string in the format "YYYY-MM-DD HH:mm:ss"
 */
export function timestampToDateString(timestamp: number): string {
    const date = new Date(timestamp * 1e3);

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();

    return `${padNumber(year, 4)}-${padNumber(month, 2)}-${padNumber(day, 2)} ${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(seconds, 2)}`;
}
