import { bitLength } from "@lib/util";

/**
 * PADME padding ([Nikitin, Barman et al., 2019](https://arxiv.org/pdf/1806.03160v4)).
 *
 * PADME bounds the padding overhead to a small fraction of the file size while collapsing file
 * lengths into a limited number of buckets, reducing (but not eliminating) length leakage to
 * O(log log n).
 */
export default class PADME {
    /**
     * Computes the PADME-padded length for a plaintext of `length` bytes.
     *
     * @param length length of plaintext
     * @returns padded length
     * @throws {Error} if the provided length is negative
     * @throws {Error} if the padded length is not exactly representable as a number
     */
    static computePaddedLength(length: number): number {
        if (length < 0) {
            throw new Error("length must be non-negative");
        }

        if (length < 2) {
            return length;
        }

        // The computation is done with `BigInt`s so that the mask never overflows
        const value = BigInt(length);
        const exponent = bitLength(value) - 1n;
        const significant = bitLength(exponent);
        const lastBits = exponent - significant;
        const bitMask = (1n << lastBits) - 1n;
        const padded = (value + bitMask) & ~bitMask;

        if (padded > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error("padded length is too large");
        }
        return Number(padded);
    }

    /**
     * Checks if the provided value is a fixed point of the PADME length function.
     *
     * A valid PADME length is a fixed point of the PADME length function, and thus this function
     * can be used to validate that a given length is a valid PADME length.
     *
     * @param value value to check
     * @returns whether the value is a fixed point
     */
    static isFixedPoint(value: number): boolean {
        try {
            return PADME.computePaddedLength(value) === value;
        } catch {
            return false;
        }
    }
}
