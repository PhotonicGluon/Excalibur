/**
 * Calls the given `updater` with the given `value` and then waits until the next tick to resolve.
 *
 * This is useful for updating state and then waiting for that state to be processed by the rest
 * of the application before continuing.
 *
 * @param value The value to be passed to the given `updater`.
 * @param updater A function that takes the given `value` and updates state based on it.
 * @returns A promise that resolves when the state has been updated and the application has had a
 * chance to process that state.
 */
export async function updateAndYield<T>(value: T, updater: (x: T) => void): Promise<void> {
    return new Promise((resolve) => {
        updater(value);
        // `setTimeout` with 0ms delay queues the 'resolve' call to run on the next event loop tick.
        // This gives React time to process the state update and re-render the UI.
        setTimeout(resolve, 0);
    });
}
