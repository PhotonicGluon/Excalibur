import randomBytes from "randombytes";

import { bigIntToBytes, bytesToBigInt, modInv, modulo, powmod } from "@lib/util";

/**
 * Implementation of the Ristretto255 group from
 * [RFC9496](https://datatracker.ietf.org/doc/html/rfc9496), section 4.
 */
export default class Ristretto255 {
    static readonly P = 2n ** 255n - 19n; // See section 2
    static readonly ORDER = 2n ** 252n + 27742317777372353535851937790883648493n; // `l` in Section 4
    static readonly KEY_LENGTH = 32;

    // Constants taken from Section 4.1
    static readonly D = 37095705934669439343138083508754565189542113879843219016388785533085940283555n;
    static readonly SQRT_M1 = 19681161376707505956807079304988542015446066515923890162744021073123829784752n;
    static readonly SQRT_AD_MINUS_ONE = 25063068953384623474111414158702152701244531502492656460079210482610430750235n;
    static readonly INVSQRT_A_MINUS_D = 54469307008909316920995813868745141605393597292927456921205312896311721017578n;
    static readonly ONE_MINUS_D_SQ = 1159843021668779879193775521855586647937357759715417654439879720876111806838n;
    static readonly D_MINUS_ONE_SQ = 40440834346308536858101042469323190826248399146238708352240133220865137265952n;

    // Generator and identity points
    static readonly IDENTITY = new Ristretto255(0n, 1n, 1n, 0n);
    static readonly GENERATOR = Ristretto255.fromBytes(
        // See section 4
        new Uint8Array(Buffer.from("e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76", "hex")),
    );

    // Instance attributes
    x: bigint;
    y: bigint;
    z: bigint;
    t: bigint;

    /**
     * Initializes a point with the given coordinates.
     *
     * @param x the x-coordinate of the point
     * @param y the y-coordinate of the point
     * @param z the z-coordinate of the point
     * @param t the t-coordinate of the point
     */
    constructor(x: bigint, y: bigint, z: bigint, t: bigint) {
        this.x = modulo(x, Ristretto255.P);
        this.y = modulo(y, Ristretto255.P);
        this.z = modulo(z, Ristretto255.P);
        this.t = modulo(t, Ristretto255.P);
    }

    // Helper methods
    /**
     * Checks if an element is "negative" according to section 3.1 of
     * [RFC8032](https://datatracker.ietf.org/doc/html/inline-errata/rfc8032.html). That is, this
     * function returns `true` if the least nonnegative integer representing `e` is odd, and `false`
     * if it is even.
     */
    static _isNegative(e: bigint): boolean {
        return (modulo(e, Ristretto255.P) & 1n) === 1n;
    }

    /**
     * Constant-time absolute value of an element in GF(P), as suggested in section 2.2.
     *
     * @param u an element to take the absolute value of
     * @returns the absolute value of u in GF(P)
     */
    static _ctAbs(u: bigint): bigint {
        u = modulo(u, Ristretto255.P);
        return Ristretto255._isNegative(u) ? modulo(-u, Ristretto255.P) : u;
    }

    /**
     * The `SQRT_RATIO_M1` function from section 4.2.
     *
     * @param u The numerator
     * @param v The denominator
     * @returns a tuple of two elements. The first is a boolean indicating whether `u/v` is a
     *      square in the field GF(P). The second depends:
     *      - `+sqrt(u/v)` if `u` and `v` are nonzero and `u/v` is square in the field
     *      - `0` if `u = 0`
     *      - `0` if `v = 0` and `u != 0`
     *      - `sqrt(SQRT_M1*(u/v))` if `u` and `v` are nonzero and `u/v` is non-square in the field
     */
    static _sqrtRatioM1(u: bigint, v: bigint): [boolean, bigint] {
        u = modulo(u, Ristretto255.P);
        v = modulo(v, Ristretto255.P);

        const vvv = powmod(v, 3n, Ristretto255.P);
        const vvvvvvv = powmod(v, 7n, Ristretto255.P);

        let r = modulo(u * vvv * powmod(u * vvvvvvv, (Ristretto255.P - 5n) / 8n, Ristretto255.P), Ristretto255.P); // Note: (p - 5) / 8 is an integer
        const check = modulo(v * powmod(r, 2n, Ristretto255.P), Ristretto255.P);

        const checkSignSqrt = check === u;
        const flippedSignSqrt = check === modulo(-u, Ristretto255.P);
        const flippedSignSqrtI = check === modulo(-u * Ristretto255.SQRT_M1, Ristretto255.P);

        const r_prime = modulo(Ristretto255.SQRT_M1 * r, Ristretto255.P);
        r = flippedSignSqrt || flippedSignSqrtI ? r_prime : r;

        // Choose the non-negative square root
        r = this._ctAbs(r);

        const wasSquare = checkSignSqrt || flippedSignSqrt;

        return [wasSquare, r];
    }

    /**
     * Maps a 32-byte string to a point on the Ristretto255 curve, following section 4.3.4's `MAP`
     * function.
     *
     * @param b a 32-byte string
     * @returns a point on the Ristretto255 curve
     */
    static _mapFunction(b: Uint8Array): Ristretto255 {
        // Step 1
        const masked_b = new Uint8Array(b);
        masked_b[31] &= 0x7f; // Mask final bit
        let r = bytesToBigInt(masked_b, "little");
        const t = modulo(r, Ristretto255.P);

        // Step 2
        r = modulo(Ristretto255.SQRT_M1 * powmod(t, 2n, Ristretto255.P), Ristretto255.P);
        const u = modulo((r + 1n) * Ristretto255.ONE_MINUS_D_SQ, Ristretto255.P);
        const v = modulo((-1n - r * Ristretto255.D) * (r + Ristretto255.D), Ristretto255.P);

        const [wasSquare, s] = Ristretto255._sqrtRatioM1(u, v);
        const sPrime = modulo(-Ristretto255._ctAbs(s * t), Ristretto255.P);
        const sFinal = wasSquare ? s : sPrime;
        const c = wasSquare ? -1n : r;

        const n = modulo(c * (r - 1n) * Ristretto255.D_MINUS_ONE_SQ - v, Ristretto255.P);

        const w0 = modulo(2n * sFinal * v, Ristretto255.P);
        const w1 = modulo(n * Ristretto255.SQRT_AD_MINUS_ONE, Ristretto255.P);
        const w2 = modulo(1n - powmod(sFinal, 2n, Ristretto255.P), Ristretto255.P);
        const w3 = modulo(1n + powmod(sFinal, 2n, Ristretto255.P), Ristretto255.P);

        // Step 3
        return new Ristretto255(w0 * w3, w2 * w1, w1 * w3, w0 * w2);
    }

    // 'Arithmetic' operations
    neg(): Ristretto255 {
        return new Ristretto255(modulo(-this.x, Ristretto255.P), this.y, this.z, modulo(-this.t, Ristretto255.P));
    }

    add(other: Ristretto255): Ristretto255 {
        const x1 = this.x;
        const y1 = this.y;
        const z1 = this.z;
        const t1 = this.t;
        const x2 = other.x;
        const y2 = other.y;
        const z2 = other.z;
        const t2 = other.t;

        const a = modulo(x1 * x2, Ristretto255.P);
        const b = modulo(y1 * y2, Ristretto255.P);
        const c = modulo(Ristretto255.D * t1 * t2, Ristretto255.P);
        const d = modulo(z1 * z2, Ristretto255.P);

        const e = modulo((x1 + y1) * (x2 + y2) - a - b, Ristretto255.P);
        const f = modulo(d - c, Ristretto255.P);
        const g = modulo(d + c, Ristretto255.P);
        const h = modulo(b + a, Ristretto255.P);

        const x3 = modulo(e * f, Ristretto255.P);
        const y3 = modulo(g * h, Ristretto255.P);
        const t3 = modulo(e * h, Ristretto255.P);
        const z3 = modulo(f * g, Ristretto255.P);

        return new Ristretto255(x3, y3, z3, t3);
    }

    sub(other: Ristretto255): Ristretto255 {
        return this.add(other.neg());
    }

    /**
     * Scalar multiplication using Montgomery ladder.
     *
     * See https://en.wikipedia.org/wiki/Elliptic_curve_point_multiplication#Montgomery_ladder.
     *
     * @param scalar the scalar to multiply by
     * @returns the result of the scalar multiplication
     */
    mul(scalar: bigint): Ristretto255 {
        scalar = modulo(scalar, Ristretto255.ORDER); // See section 4.4
        const nBits = scalar.toString(2).length;

        const r = [Ristretto255.IDENTITY, this];
        for (let i = nBits - 1; i >= 0; i--) {
            const di = (scalar >> BigInt(i)) & 1n;
            r[(Number(di) + 1) % 2] = r[0].add(r[1]);
            r[Number(di)] = r[Number(di)].add(r[Number(di)]);
        }

        return r[0];
    }

    /**
     * Checks equality between two points, as given by section 4.3.3.
     *
     * @param other the other point to compare with
     * @returns `true` if the points are equal and `false` otherwise
     */
    eq(other: Ristretto255): boolean {
        return (
            modulo(this.x * other.y, Ristretto255.P) === modulo(this.y * other.x, Ristretto255.P) ||
            modulo(this.y * other.y, Ristretto255.P) === modulo(this.x * other.x, Ristretto255.P)
        );
    }

    // Public methods
    /**
     * @returns whether the current point is the identity point
     */
    isIdentity(): boolean {
        return this.eq(Ristretto255.IDENTITY);
    }

    /**
     * Generates a random scalar for the curve, using RFC9497 section 4.7.2.
     *
     * @returns a random scalar in GF(P)
     */
    static randomScalar(): bigint {
        // To ensure a uniform distribution we generate a random sequence and reduce it modulo the group order
        return modulo(bytesToBigInt(randomBytes(Ristretto255.KEY_LENGTH), "little"), Ristretto255.ORDER);
    }

    /**
     * Computes the multiplicative inverse of a scalar in the finite field GF(P).
     *
     * @param scalar the scalar to invert
     * @returns the multiplicative inverse of the scalar
     */
    static scalarInverse(scalar: bigint): bigint {
        return modInv(scalar, Ristretto255.ORDER);
    }

    /**
     * Decodes a 32-byte string as a field element, following section 4.3.1.
     *
     * This implementation differs from the reference implementation in that it will prohibit the
     * point at infinity (i.e., identity) from being decoded unless explicitly allowed.
     *
     * @param b 32-byte string
     * @param allowIdentity whether to allow the identity point to be decoded
     * @returns a point on the Ristretto255 curve
     * @throws {Error} if data is not 32 bytes or if the data is invalid (or if the point at
     *      infinity is prohibited and encountered)
     */
    static fromBytes(b: Uint8Array, allowIdentity: boolean = false): Ristretto255 {
        // Step 1
        if (b.length !== Ristretto255.KEY_LENGTH) {
            throw new Error(`data must be exactly ${Ristretto255.KEY_LENGTH} bytes long`);
        }

        const s = bytesToBigInt(b, "little");
        if (s >= Ristretto255.P) {
            throw new Error("s must be less than p");
        }

        // Step 2
        if (Ristretto255._isNegative(s)) {
            throw new Error("s must be non-negative");
        }

        // Step 3
        const ss = modulo(powmod(s, 2n, Ristretto255.P), Ristretto255.P);
        const u1 = modulo(1n - ss, Ristretto255.P);
        const u2 = modulo(1n + ss, Ristretto255.P);
        const u2Squared = powmod(u2, 2n, Ristretto255.P);

        const v = modulo(-Ristretto255.D * powmod(u1, 2n, Ristretto255.P) - u2Squared, Ristretto255.P);
        const [wasSquare, invSqrt] = Ristretto255._sqrtRatioM1(1n, modulo(v * u2Squared, Ristretto255.P));

        const denX = modulo(invSqrt * u2, Ristretto255.P);
        const denY = modulo(invSqrt * denX * v, Ristretto255.P);

        const x = Ristretto255._ctAbs(2n * s * denX);
        const y = modulo(u1 * denY, Ristretto255.P);
        const t = modulo(x * y, Ristretto255.P);

        // Step 4
        if (!wasSquare || Ristretto255._isNegative(t) || y === 0n) {
            throw new Error("invalid encoding");
        }

        // Additionally prohibit identity if not allowed
        if (!allowIdentity && x === 0n && y === 1n && t === 0n) {
            throw new Error("identity point not allowed");
        }

        return new Ristretto255(x, y, 1n, t);
    }

    /**
     * Encodes this point on the Ristretto255 curve as a 32-byte string, following section 4.3.2.
     *
     * @returns a 32-byte string representing this point
     */
    toBytes(): Uint8Array {
        const x0 = modulo(this.x, Ristretto255.P);
        const y0 = modulo(this.y, Ristretto255.P);
        const z0 = modulo(this.z, Ristretto255.P);
        const t0 = modulo(this.t, Ristretto255.P);

        // Step 1
        const u1 = modulo((z0 + y0) * (z0 - y0), Ristretto255.P);
        const u2 = modulo(x0 * y0, Ristretto255.P);

        const [, invSqrt] = Ristretto255._sqrtRatioM1(1n, modulo(u1 * u2 * u2, Ristretto255.P)); // Ignore `was_square` since this is always square

        const den1 = modulo(invSqrt * u1, Ristretto255.P);
        const den2 = modulo(invSqrt * u2, Ristretto255.P);
        const zInv = modulo(den1 * den2 * t0, Ristretto255.P);

        const ix0 = modulo(x0 * Ristretto255.SQRT_M1, Ristretto255.P);
        const iy0 = modulo(y0 * Ristretto255.SQRT_M1, Ristretto255.P);
        const enchantedDenominator = modulo(den1 * Ristretto255.INVSQRT_A_MINUS_D, Ristretto255.P);

        const rotate = Ristretto255._isNegative(t0 * zInv);

        // Conditionally rotate x and y
        const x = rotate ? iy0 : x0;
        let y = rotate ? ix0 : y0;
        const z = z0;
        const den_inv = rotate ? enchantedDenominator : den2;

        y = Ristretto255._isNegative(x * zInv) ? modulo(-y, Ristretto255.P) : y;

        const s = Ristretto255._ctAbs(den_inv * (z - y));

        // Step 2
        return bigIntToBytes(s, 32, "little");
    }

    /**
     * Derives a point on the curve from a `2*KEY_LENGTH`-byte string.
     *
     * @param b a `2*KEY_LENGTH`-byte string
     * @returns a point on the curve
     * @throws {Error} if input is not `2*KEY_LENGTH` bytes long
     */
    static derive(b: Uint8Array): Ristretto255 {
        if (b.length !== 2 * Ristretto255.KEY_LENGTH) {
            throw new Error(`input must be exactly ${2 * Ristretto255.KEY_LENGTH} bytes long`);
        }
        const x = Ristretto255._mapFunction(b.slice(0, Ristretto255.KEY_LENGTH));
        const y = Ristretto255._mapFunction(b.slice(Ristretto255.KEY_LENGTH, 2 * Ristretto255.KEY_LENGTH));
        return x.add(y);
    }
}
