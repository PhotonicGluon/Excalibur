/** Whether the process is running in development mode */
export const IS_DEV = import.meta.env.DEV;
/** Whether the process is running in test mode */
export const IS_TEST = import.meta.env.MODE === "test";

/** How long a toast lasts on screen, in milliseconds */
export const TOAST_DURATION: number = !IS_TEST ? 2000 : 100;
