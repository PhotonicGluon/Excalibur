import { expect, vi } from "vitest";

import { sleep } from "./misc";

describe("sleep", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should sleep for the given duration", async () => {
        const duration = 1000;
        const sleepPromise = sleep(duration);
        await vi.advanceTimersByTimeAsync(duration);
        await expect(sleepPromise).resolves.toBeUndefined();
    });

    it("should not resolve before the specified duration has passed", async () => {
        const duration = 5000;
        const onResolve = vi.fn();

        // Initial call should not resolve
        sleep(duration).then(onResolve);
        expect(onResolve).not.toHaveBeenCalled();

        // Advancing by `duration - 1` should not resolve
        await vi.advanceTimersByTimeAsync(duration - 1);
        expect(onResolve).not.toHaveBeenCalled();

        // Advancing 1 more millisecond should resolve
        await vi.advanceTimersByTimeAsync(1);
        expect(onResolve).toHaveBeenCalledTimes(1);
    });
});
