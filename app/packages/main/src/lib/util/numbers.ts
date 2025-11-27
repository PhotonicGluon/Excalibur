import { FileSizeUnits } from "@lib/preferences/settings";

/**
 * Pads a number with leading zeros to ensure it has at least the specified length.
 *
 * @param num The number to pad.
 * @param length The desired length of the resulting string.
 * @returns A string representation of the number, padded with leading zeros.
 */
export function padNumber(num: number, length: number): string {
    return num.toString().padStart(length, "0");
}

/**
 * Converts a given number of bytes into a human-readable format.
 *
 * @param bytes The number of bytes
 * @param units The units to use. `iec` for 1024-based (KiB, MiB, GiB) and `si` for 1000-based
 *      (KB, MB, GB). Defaults to `iec`
 * @returns A string like "4.00 KiB", "1.00 GB", etc.
 */
export function bytesToHumanReadable(bytes: number, units: FileSizeUnits = "iec"): string {
    const prefixes = ["", "K", "M", "G"];
    const multiple = units === "iec" ? 1024 : 1000;
    const origBytes = bytes;

    // Find the unit index
    let unitIndex = 0;
    while (bytes >= multiple) {
        bytes /= multiple;
        unitIndex++;
    }

    // Generate unit string
    let unit: string;
    if (unitIndex === 0) {
        unit = "B";
    } else if (units === "iec") {
        unit = `${prefixes[unitIndex]}iB`;
    } else {
        if (unitIndex === 1) {
            // Kilo needs to be lowercase as per SI unit standard
            unit = "kB";
        } else {
            unit = `${prefixes[unitIndex]}B`;
        }
    }

    // Format file size and return
    return `${origBytes < multiple ? bytes : bytes.toFixed(2)} ${unit}`;
}
