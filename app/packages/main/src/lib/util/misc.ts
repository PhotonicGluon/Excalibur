/** Whether the process is running in development mode */
export const IS_DEV = import.meta.env.DEV;

/**
 * Sleeps for the given duration.
 *
 * @param duration duration in milliseconds to sleep for
 */
export async function sleep(duration: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, duration);
    });
}

/**
 * Splits an array into chunks of at most {@link size} elements.
 *
 * @param items the array to chunk
 * @param size the maximum chunk size
 * @returns the chunked array
 */
export function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}
