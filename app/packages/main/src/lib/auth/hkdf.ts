import { createHmac } from "crypto";

/** Supported algorithms for HKDF */
export type HKDFAlgorithm = "sha1" | "sha256";
const HASH_LEN: Record<HKDFAlgorithm, number> = {
    sha1: 20,
    sha256: 32,
};

/**
 * HKDF HMAC-Hash function as defined in RFC5869
 */
function hmacHash(algorithm: HKDFAlgorithm, key: Buffer, data: Buffer): Buffer {
    return createHmac(algorithm, key).update(data).digest();
}

/**
 * HKDF-Extract function as defined in RFC5869
 */
function extract(algorithm: HKDFAlgorithm, salt: Buffer | null, ikm: Buffer): Buffer {
    if (!salt) {
        salt = Buffer.alloc(HASH_LEN[algorithm]);
    }
    return hmacHash(algorithm, salt, ikm);
}

/**
 * HKDF-Expand function as defined in RFC5869
 */
function expand(algorithm: HKDFAlgorithm, prk: Buffer, info: Buffer, l: number): Buffer {
    let t: Buffer = Buffer.from([]);
    let o: Buffer = Buffer.from([]);
    for (let i = 0; i < Math.ceil(l / HASH_LEN[algorithm]); i++) {
        t = hmacHash(algorithm, prk, Buffer.concat([t, info, Buffer.from([i + 1])]));
        o = Buffer.concat([o, t]);
    }
    return o.subarray(0, l);
}

/**
 * HMAC-based Key Derivation Function (HKDF).
 *
 * @param algorithm HMAC algorithm to use
 * @param ikm Input keying material
 * @param salt Optional salt value (a non-secret random value). If not provided, it is set to a string of zeros equivalent to the hash length of the algorithm
 * @param info Optional context and application specific information (can be a zero-length string)
 * @param l Length of output keying material in bytes (octets)
 * @returns Output keying material (of `l` bytes)
 */
export default function hkdf(
    algorithm: HKDFAlgorithm,
    ikm: Buffer,
    salt: Buffer | null,
    info: Buffer,
    l: number,
): Buffer {
    const prk = extract(algorithm, salt, ikm);
    return expand(algorithm, prk, info, l);
}
