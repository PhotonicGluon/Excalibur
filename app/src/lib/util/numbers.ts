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
 * @param bytes The number of bytes.
 * @param use1024Units If true, the units will be 1024-based (KiB, MiB, GiB) instead of 1000-based
 *      (KB, MB, GB).
 * @returns A string like "4.00 KiB", "1.00 GB", etc.
 */
export function bytesToHumanReadable(bytes: number, use1024Units?: boolean): string {
    const prefixes = ["", "K", "M", "G"];
    const multiple = use1024Units ? 1024 : 1000;
    const origBytes = bytes;

    let unitIndex = 0;
    while (bytes >= multiple) {
        bytes /= multiple;
        unitIndex++;
    }

    const unit = `${prefixes[unitIndex]}${origBytes >= multiple && use1024Units ? "i" : ""}B`;
    return `${origBytes < multiple ? bytes : bytes.toFixed(2)} ${unit}`;
}
