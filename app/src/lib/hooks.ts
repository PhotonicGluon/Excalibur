import { EffectCallback, useEffect } from "react";

/**
 * Runs the given effect only once, after the first render.
 *
 * @param effect The effect to run
 */
export const useEffectOnce = (effect: EffectCallback) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(effect, []);
};

/**
 * Runs the given function only once, after the first render.
 *
 * @param fun The function to run
 */
export const useMount = (fun: () => void) => {
    useEffectOnce(() => fun());
};
