import { createHash } from "crypto";

import { powmod } from "@lib/math";
import { bufferToNumber, numberToBuffer, padBuffer } from "@lib/util";

/**
 * Underlying SRP group implementation, based off RFC5054 and RFC2945.
 */
export class _SRPGroup {
    /** The number of bits for the prime in the group */
    readonly bits: number;
    /** The prime in the group */
    readonly prime: bigint;
    /** The generator to use for SRP */
    readonly generator: bigint;
    /** The `k` value for the group */
    readonly multiplier: bigint;

    /**
     * Initializes an SRP group with specified bit length, prime, and generator.
     *
     * @param bits The number of bits for the prime.
     * @param prime The prime number in hexadecimal string format.
     * @param generator The generator value for the SRP group.
     */
    constructor(bits: number, prime: string, generator: bigint) {
        this.bits = bits;
        this.prime = bufferToNumber(Buffer.from(prime.replaceAll(" ", ""), "hex"));
        this.generator = generator;

        // Derive multiplier (k) from prime and generator as described in RFC5054
        const paddedGenerator = padBuffer(numberToBuffer(this.generator), this.bits / 8);
        const predigest = Buffer.concat([numberToBuffer(this.prime), paddedGenerator]);
        const digest = createHash("sha1").update(predigest).digest();
        this.multiplier = bufferToNumber(digest);
    }

    /**
     * Generates the SRP verifier for the given key.
     *
     * @param key The key as a buffer, which will be converted to a bigint.
     * @returns The computed verifier as a bigint.
     */
    generateVerifier(key: Buffer): bigint {
        return powmod(this.generator, bufferToNumber(key), this.prime);
    }
}

// The SRP groups as defined in RFC5054
export const SRPGroup = {
    SMALL: new _SRPGroup(
        1024,
        "EEAF0AB9 ADB38DD6 9C33F80A FA8FC5E8 60726187 75FF3C0B 9EA2314C 9C256576 D674DF74 96EA81D3 383B4813 D692C6E0 E0D5D8E2 50B98BE4 8E495C1D 6089DAD1 5DC7D7B4 6154D6B6 CE8EF4AD 69B15D49 82559B29 7BCF1885 C529F566 660E57EC 68EDBC3C 05726CC0 2FD4CBF4 976EAA9A FD5138FE 8376435B 9FC61D2F C0EB06E3",
        2n,
    ),
    MEDIUM: new _SRPGroup(
        1536,
        "9DEF3CAF B939277A B1F12A86 17A47BBB DBA51DF4 99AC4C80 BEEEA961 4B19CC4D 5F4F5F55 6E27CBDE 51C6A94B E4607A29 1558903B A0D0F843 80B655BB 9A22E8DC DF028A7C EC67F0D0 8134B1C8 B9798914 9B609E0B E3BAB63D 47548381 DBC5B1FC 764E3F4B 53DD9DA1 158BFD3E 2B9C8CF5 6EDF0195 39349627 DB2FD53D 24B7C486 65772E43 7D6C7F8C E442734A F7CCB7AE 837C264A E3A9BEB8 7F8A2FE9 B8B5292E 5A021FFF 5E91479E 8CE7A28C 2442C6F3 15180F93 499A234D CF76E3FE D135F9BB",
        2n,
    ),
    LARGE: new _SRPGroup(
        2048,
        "AC6BDB41 324A9A9B F166DE5E 1389582F AF72B665 1987EE07 FC319294 3DB56050 A37329CB B4A099ED 8193E075 7767A13D D52312AB 4B03310D CD7F48A9 DA04FD50 E8083969 EDB767B0 CF609517 9A163AB3 661A05FB D5FAAAE8 2918A996 2F0B93B8 55F97993 EC975EEA A80D740A DBF4FF74 7359D041 D5C33EA7 1D281E44 6B14773B CA97B43A 23FB8016 76BD207A 436C6481 F1D2B907 8717461A 5B9D32E6 88F87748 544523B5 24B0D57D 5EA77A27 75D2ECFA 032CFBDB F52FB378 61602790 04E57AE6 AF874E73 03CE5329 9CCC041C 7BC308D8 2A5698F3 A8D0C382 71AE35F8 E9DBFBB6 94B5C803 D89F7AE4 35DE236D 525F5475 9B65E372 FCD68EF2 0FA7111F 9E4AFF73",
        2n,
    ),
} as const;

/**
 * Retrieves the SRP group corresponding to the specified bit size.
 *
 * @param bits The bit size of the SRP group. Supported values are 1024 (`SMALL`), 1536 (`MEDIUM`),
 *      and 2048 (`LARGE`).
 * @returns The SRP group matching the provided bit size.
 * @throws Will throw an error if the bit size is not supported.
 */
export function getSRPGroup(bits: number): _SRPGroup {
    switch (bits) {
        case 1024:
            return SRPGroup.SMALL;
        case 1536:
            return SRPGroup.MEDIUM;
        case 2048:
            return SRPGroup.LARGE;
    }
    throw new Error(`Unsupported SRP group size: ${bits}`);
}
