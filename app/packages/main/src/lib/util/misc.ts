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
