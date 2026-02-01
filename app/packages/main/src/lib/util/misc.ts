/** Whether the process is running in development mode */
export const IS_DEV = process.env.NODE_ENV === "development";

/**
 * Sleeps for the given duration.
 *
 * @param duration Duration in milliseconds to sleep for
 */
export async function sleep(duration: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(resolve, duration);
    });
}
