import { createHmac } from "crypto";

/** Supported algorithms for HKDF */
export type HKDFAlgorithm = "sha1" | "sha256" | "sha512";
const HASH_LEN: Record<HKDFAlgorithm, number> = {
    sha1: 20,
    sha256: 32,
    sha512: 64,
};

/**
 * HMAC-based Key Derivation Function (HKDF) implementation based on
 * [RFC5869](https://datatracker.ietf.org/doc/html/rfc5869).
 */
export default class HKDF {
    private algorithm: HKDFAlgorithm;
    readonly digestSize: number;

    constructor(algorithm: HKDFAlgorithm) {
        this.algorithm = algorithm;
        this.digestSize = HASH_LEN[algorithm];
    }

    /**
     * HKDF HMAC-Hash function as defined in RFC5869.
     *
     * @param key the key to use for the HMAC
     * @param msg the message to hash
     * @returns the hashed message
     */
    hmacHash(key: Buffer, msg: Buffer): Buffer {
        return createHmac(this.algorithm, key).update(msg).digest();
    }

    /**
     * The `HKDF-Extract()` function described in section 2.2.
     *
     * @param salt optional salt value
     * @param ikm input keying material
     * @returns a pseudorandom key
     */
    extract(salt: Buffer | null, ikm: Buffer): Buffer {
        if (!salt) {
            salt = Buffer.alloc(HASH_LEN[this.algorithm]);
        }
        return this.hmacHash(salt, ikm);
    }

    /**
     * The `HKDF-Expand()` function described in section 2.3.
     *
     * @param prk a pseudorandom key of at least digest size bytes
     * @param info optional context and application specific information
     * @param length length of output keying material in bytes
     * @returns output keying material of `length` bytes
     */
    expand(prk: Buffer, info: Buffer, length: number) {
        let t: Buffer = Buffer.from([]);
        let o: Buffer = Buffer.from([]);
        for (let i = 0; i < Math.ceil(length / this.digestSize); i++) {
            t = this.hmacHash(prk, Buffer.concat([t, info, Buffer.from([i + 1])]));
            o = Buffer.concat([o, t]);
        }
        return o.subarray(0, length);
    }

    /**
     * HMAC-based Key Derivation Function (HKDF).
     *
     * @param ikm input keying material
     * @param salt optional salt value
     * @param info optional context and application specific information
     * @param length length of output keying material in bytes
     * @returns output keying material (of `l` bytes)
     */
    hkdf(ikm: Buffer, salt: Buffer | null, info: Buffer, length: number): Buffer {
        const prk = this.extract(salt, ikm);
        return this.expand(prk, info, length);
    }
}
