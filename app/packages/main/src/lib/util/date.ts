import { padNumber } from "./numbers";

/**
 * @returns the local IANA timezone of the client
 */
export function getLocalTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Changes the timezone of a date object
 * @param date the date to change
 *
 * @param timezone the timezone to use, defaults to local timezone
 * @returns a new Date object with the specified timezone
 */
export function changeTimezone(date: Date, timezone?: string): Date {
    return new Date(date.toLocaleString("en", { timeZone: timezone ?? getLocalTimeZone() }));
}

/**
 * Converts a Unix timestamp (seconds since epoch) to a human-readable date string for the *local*
 * timezone.
 *
 * @param timestamp the Unix timestamp in seconds
 * @param timezone the timezone to use, defaults to local timezone
 * @returns a string in the format "YYYY-MM-DD HH:mm:ss"
 */
export function timestampToDateString(timestamp: number, timezone?: string): string {
    const date = changeTimezone(new Date(timestamp * 1e3), timezone);

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return `${padNumber(year, 4)}-${padNumber(month, 2)}-${padNumber(day, 2)} ${padNumber(hours, 2)}:${padNumber(minutes, 2)}:${padNumber(seconds, 2)}`;
}
