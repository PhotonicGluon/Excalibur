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
 * Gets the number of bits needed to represent the specified value.
 *
 * @param value value to measure
 * @returns bit length of `value`
 */
export function bitLength(value: bigint): bigint {
    return value === 0n ? 0n : BigInt(value.toString(2).length);
}

/**
 * Converts a given array of bytes into a bigint.
 *
 * @param bytes The array of bytes
 * @param endianness The endianness to use
 * @returns A bigint representation of the bytes
 */
export function bytesToBigInt(bytes: Uint8Array, endianness: "little" | "big" = "big"): bigint {
    const numBytes = bytes.length;

    let hex = "";
    for (let i = 0; i < numBytes; i++) {
        const byte = endianness === "little" ? bytes[numBytes - 1 - i] : bytes[i];
        hex += byte.toString(16).padStart(2, "0");
    }
    return BigInt(`0x${hex}`);
}

/**
 * Converts a given bigint into an array of bytes.
 *
 * @param bigint The bigint to convert
 * @param length The length of the array
 * @param endianness The endianness to use
 * @returns An array of bytes
 */
export function bigIntToBytes(bigint: bigint, length: number, endianness: "little" | "big" = "big"): Uint8Array {
    const hex = bigint.toString(16).padStart(length * 2, "0");
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        bytes[endianness === "little" ? length - 1 - i : i] = byte;
    }
    return bytes;
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
