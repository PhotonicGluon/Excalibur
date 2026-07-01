import createHash from "create-hash";

import HKDF from "@lib/crypto/hkdf";

import { GCMCipher, GCMDecipher } from "../cipher";
import Ristretto255 from "./ristretto255";

const PROTOCOL_NAME = Buffer.from("Noise_NK_Ristretto255_AESGCM_SHA256");

/**
 * [Noise-NK protocol](https://noiseprotocol.org/noise.html) implementation using Ristretto255,
 * AES-GCM, and SHA256.
 */
export default class NoiseNK {
    /** Server public key */
    private serverPub: Ristretto255;
    /** Hash output */
    private h: Buffer;
    /** Chaining key */
    private ck: Buffer;

    /**
     * Client's ephemeral private keyshare.
     *
     * This is set during the client-to-server message exchange.
     */
    private clientKeysharePriv: bigint = 0n;

    constructor(serverPub: Ristretto255) {
        this.serverPub = serverPub;

        // Initialization
        this.h = this._sha256(PROTOCOL_NAME).digest();
        this.ck = this.h;

        // Pre-message
        this.h = this._sha256(Buffer.concat([this.h, this.serverPub.toBytes()])).digest();
    }

    // Helper methods
    private _sha256(data: Uint8Array) {
        return createHash("sha256").update(data);
    }

    private _hkdf(ikm: Buffer, numOutputs: 2 | 3): Buffer[] {
        const hkdf = new HKDF("sha256");
        const tempKey = hkdf.hmacHash(this.ck, ikm);

        const output1 = hkdf.hmacHash(tempKey, Buffer.from([1]));
        const output2 = hkdf.hmacHash(tempKey, Buffer.concat([output1, Buffer.from([2])]));

        if (numOutputs === 2) {
            return [output1, output2];
        }

        const output3 = hkdf.hmacHash(tempKey, Buffer.concat([output2, Buffer.from([3])]));
        return [output1, output2, output3];
    }

    private _mixHash(data: Uint8Array) {
        this.h = this._sha256(Buffer.concat([this.h, data])).digest();
    }

    private _mixKey(ikm: Buffer): Buffer {
        const [newCk, k] = this._hkdf(ikm, 2);
        this.ck = newCk;
        return k;
    }

    private _encryptAndHash(k: Buffer, pt: Buffer): Buffer {
        const cipher = new GCMCipher("aes-256-gcm", k, Buffer.alloc(12));
        const ct = Buffer.concat([cipher.update(pt), cipher.final(), cipher.getAuthTag()]);
        this._mixHash(ct);
        return ct;
    }

    private _decryptAndHash(k: Buffer, ct: Buffer): Buffer {
        this._mixHash(ct);
        const ciphertext = ct.subarray(0, -16);
        const tag = ct.subarray(-16);

        const cipher = new GCMDecipher("aes-256-gcm", k, Buffer.alloc(12));
        cipher.setAuthTag(tag);
        const pt = Buffer.concat([cipher.update(ciphertext), cipher.final()]);
        return pt;
    }

    // Main methods
    /**
     * Client to server message.
     *
     * @param clientKeysharePriv optional client ephemeral private keyshare value
     * @returns client's public keyshare and authentication tag
     */
    messageCToS(clientKeysharePriv?: bigint): [Ristretto255, Buffer] {
        // Message pattern "e"
        this.clientKeysharePriv = clientKeysharePriv ?? Ristretto255.randomScalar();
        const clientKeysharePub = Ristretto255.GENERATOR.mul(this.clientKeysharePriv);
        this._mixHash(clientKeysharePub.toBytes());

        // Message pattern "es"
        const dh = this.serverPub.mul(this.clientKeysharePriv).toBytes();
        const k = this._mixKey(Buffer.from(dh));

        // EncryptAndHash(empty)
        const tag = this._encryptAndHash(k, Buffer.alloc(0));
        return [clientKeysharePub, tag];
    }

    /**
     * Derive the session key on the client side.
     *
     * @param serverKeysharePub server's ephemeral public keyshare
     * @param serverTag server's tag
     * @returns the shared secret
     */
    deriveSessionKey(serverKeysharePub: Ristretto255, serverTag: Buffer): Buffer {
        // Verify server message
        this._mixHash(serverKeysharePub.toBytes());
        const dh = serverKeysharePub.mul(this.clientKeysharePriv).toBytes();
        const k = this._mixKey(Buffer.from(dh));
        this._decryptAndHash(k, serverTag);

        // Derive session key
        const [kSend, _] = this._hkdf(Buffer.alloc(0), 2);
        return kSend;
    }
}
