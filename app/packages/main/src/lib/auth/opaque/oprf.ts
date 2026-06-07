import createHash from "create-hash";

import { bigIntToBytes, bytesToBigInt, modulo, xorBuffer } from "@lib/util";

import { i2osp } from "./misc";
import { Ristretto255 } from "./ristretto255";

/**
 * Base class for an Oblivious Pseudo-Random Function (OPRF) implementation using the Ristretto255
 * curve based on [RFC9497](https://datatracker.ietf.org/doc/html/rfc9497).
 */
abstract class BaseOPRFRistretto {
    abstract hashfunc(msg: Uint8Array): { digest(): Uint8Array };
    protected abstract readonly CONTEXT_STRING: Uint8Array;

    // Helper methods
    /**
     * Implements the `expand_message_xmd()` function in RFC9380, section 5.3.1.
     *
     * Call this if the class uses an XMD hash function.
     *
     * @param msg a byte string
     * @param dst a byte string of at most 255 bytes
     * @param lenInBytes the length of the requested output in bytes
     * @returns a byte string of length `lenInBytes`
     * @throws {Error} if the length or destination is too long
     */
    protected _expandMessageXMD(msg: Uint8Array, dst: Uint8Array, lenInBytes: number): Uint8Array {
        const ell = Math.ceil(lenInBytes / 64);
        const dstPrime = Buffer.concat([dst, i2osp(BigInt(dst.length), 1)]);

        const zPad = i2osp(0n, 128);
        const lenInBytesAsBytes = i2osp(BigInt(lenInBytes), 2);
        const msgPrime = Buffer.concat([zPad, msg, lenInBytesAsBytes, i2osp(0n, 1), dstPrime]);

        const b0 = Buffer.from(this.hashfunc(msgPrime).digest());

        const b: Buffer[] = new Array(ell + 1);
        b[1] = Buffer.from(this.hashfunc(Buffer.concat([b0, i2osp(1n, 1), dstPrime])).digest());

        for (let i = 2; i <= ell; i++) {
            b[i] = Buffer.from(
                this.hashfunc(Buffer.concat([xorBuffer(b[i - 1], b0), i2osp(BigInt(i), 1), dstPrime])).digest(),
            );
        }

        const uniformBytes = Buffer.concat(b.slice(1));
        return uniformBytes.subarray(0, lenInBytes);
    }

    /**
     * Implements the `hash_to_ristretto255()` function described in RFC9380, appendix B.
     * @param msg a byte string
     * @param dst a byte string of at most 255 bytes
     * @returns a point on the Ristretto255 curve
     */
    protected _hashToRistretto(msg: Uint8Array, dst: Uint8Array): Ristretto255 {
        const uniformBytes = this._expandMessageXMD(msg, dst, 64);
        const pt = Ristretto255.derive(uniformBytes);
        return pt;
    }

    /**
     * Implements the `HashToScalar()` function described in RFC9497, section 4.1.
     *
     * @param msg a byte array
     * @param dst an optional byte string of at most 255 bytes
     * @returns a scalar
     */
    protected _hashToScalar(msg: Uint8Array, dst?: Uint8Array): bigint {
        dst = dst || Buffer.from("HashToScalar-" + this.CONTEXT_STRING);
        const uniformBytes = this._expandMessageXMD(msg, dst, 64);
        return modulo(bytesToBigInt(uniformBytes, "little"), Ristretto255.ORDER);
    }

    /**
     * Implements the `HashToGroup()` function described in RFC9497, section 4.1.
     *
     * @param msg a byte array
     * @param dst an optional byte string of at most 255 bytes
     * @returns a curve point
     */
    protected _hashToGroup(msg: Uint8Array, dst?: Uint8Array): Ristretto255 {
        dst = dst || Buffer.from("HashToGroup-" + this.CONTEXT_STRING);
        return this._hashToRistretto(msg, dst);
    }

    // Public methods
    /**
     * Generates a public-private key pair, following RFC9497 section 3.2 (and 3.2.1).
     *
     * @param seed a byte string used as a seed for key generation
     * @param info additional information to include in the key generation process
     * @param forExport whether the keys are being generated for export (i.e. they will be
     * converted into bytes)
     * @returns a tuple of (private_key, public_key)
     */
    generateKeys(
        seed?: Uint8Array,
        info?: Uint8Array,
        forExport?: boolean,
    ): [bigint, Ristretto255] | [Uint8Array, Uint8Array] {
        let privateKey: bigint;

        if (!seed) {
            // See RFC9497, section 3.2
            privateKey = Ristretto255.randomScalar();
        } else {
            // See RFC9497, section 3.2.1
            const deriveInput = Buffer.concat([seed, i2osp(BigInt(info?.length ?? 0), 2), info ?? new Uint8Array()]);
            let counter = 0;
            privateKey = 0n;
            while (privateKey === 0n) {
                if (counter > 255) {
                    throw new Error("unable to generate private key");
                }
                privateKey = this._hashToScalar(
                    Buffer.concat([deriveInput, i2osp(BigInt(counter), 1)]),
                    Buffer.concat([Buffer.from("DeriveKeyPair"), this.CONTEXT_STRING]),
                );
                counter++;
            }
        }

        const publicKey = Ristretto255.GENERATOR.mul(privateKey);

        if (forExport) {
            return [bigIntToBytes(privateKey, Ristretto255.KEY_LENGTH, "little"), publicKey.toBytes()];
        }

        return [privateKey, publicKey];
    }

    /**
     * The client `Blind()` function as described in RFC9497, section 3.1.1.
     *
     * @param input a byte string
     * @param blind an optional blinding factor from GF(P). If not provided, a random one will be
     *      generated
     * @returns a tuple, where the first represents the "blinding scalar" and the second represents
     * the "blinded element"
     * @throws {Error} if the input element is the identity
     */
    blind(input: Uint8Array, blind?: bigint): [bigint, Ristretto255] {
        blind = blind || Ristretto255.randomScalar();
        const inputElement = this._hashToGroup(input);

        if (inputElement.isIdentity()) {
            throw new Error("input element is identity");
        }

        const blindedElement = inputElement.mul(blind);
        return [blind, blindedElement];
    }

    /**
     * The server `BlindEvaluate()` function as described in RFC9497, section 3.1.1.
     *
     * @param skScalar the server's secret key, as a scalar in GF(P)
     * @param blindedElement the blinded element
     * @returns the evaluated element
     */
    blindEvaluate(skScalar: bigint, blindedElement: Ristretto255): Ristretto255 {
        return blindedElement.mul(skScalar);
    }

    /**
     * The client `Finalize()` function as described in RFC9497, section 3.1.1.
     *
     * @param input a byte string
     * @param blind the blinding scalar
     * @param evaluatedElement the evaluated element
     * @returns a byte string
     */
    finalize(input: Uint8Array, blind: bigint, evaluatedElement: Ristretto255): Uint8Array {
        const unblindedElement = evaluatedElement.mul(Ristretto255.scalarInverse(blind));
        const unblindedElementBytes = unblindedElement.toBytes();

        const hashInput = Buffer.concat([
            i2osp(BigInt(input.length), 2),
            input,
            i2osp(BigInt(unblindedElementBytes.length), 2),
            unblindedElementBytes,
            Buffer.from("Finalize"),
        ]);

        return this.hashfunc(hashInput).digest();
    }
}

/**
 * The `OPRF(ristretto255, SHA-512)` implementation based on
 * [RFC9497](https://datatracker.ietf.org/doc/html/rfc9497).
 */
class OPRFRistrettoSHA512 extends BaseOPRFRistretto {
    hashfunc(msg: Uint8Array): { digest(): Uint8Array } {
        const hash = createHash("sha512").update(msg);
        return { digest: () => hash.digest() };
    }
    protected readonly CONTEXT_STRING = Buffer.from("OPRFV1-\x00-ristretto255-SHA512");
}

const oprfRistrettoSHA512 = new OPRFRistrettoSHA512();

export type OPRFType = "ristretto255-sha512";
export { oprfRistrettoSHA512 as OPRFRistrettoSHA512 };
