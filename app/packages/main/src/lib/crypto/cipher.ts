import { CipherCCM, createCipheriv, createDecipheriv, DecipherCCM } from "node:crypto";

export type GCMAlgorithm = "aes-128-gcm" | "aes-192-gcm" | "aes-256-gcm";

abstract class BaseGCMCipher {
    /** Algorithm used for encryption/decryption */
    protected alg: GCMAlgorithm;
    /** Key used for encryption/decryption */
    protected key: Buffer;
    /** Initialization vector used for encryption/decryption */
    protected iv: Buffer;

    /**
     * Creates a new BaseGCMCipher instance.
     *
     * @param alg Algorithm used for encryption/decryption
     * @param key Key used for encryption/decryption
     * @param iv Initialization vector used for encryption/decryption
     */
    constructor(alg: GCMAlgorithm, key: Buffer, iv: Buffer) {
        this.alg = alg;
        this.key = key;
        this.iv = iv;
    }

    /** Updates the cipher with `data` */
    abstract update(data: Buffer): Buffer;

    /** Finalizes the cipher */
    abstract final(): Buffer;
}

export class GCMCipher extends BaseGCMCipher {
    /** Internal cipher used for encryption */
    private readonly _cipher: CipherCCM;

    constructor(alg: GCMAlgorithm, key: Buffer, iv: Buffer) {
        super(alg, key, iv);
        this._cipher = createCipheriv(this.alg, this.key, this.iv);
    }

    update(data: Buffer): Buffer {
        return this._cipher.update(data);
    }

    final(): Buffer {
        return this._cipher.final();
    }

    /** Gets the authentication tag */
    getAuthTag(): Buffer {
        return this._cipher.getAuthTag();
    }
}

export class GCMDecipher extends BaseGCMCipher {
    /** Internal cipher used for decryption */
    private readonly _cipher: DecipherCCM;

    constructor(alg: GCMAlgorithm, key: Buffer, iv: Buffer) {
        super(alg, key, iv);
        this._cipher = createDecipheriv(this.alg, this.key, this.iv);
    }

    update(data: Buffer): Buffer {
        return this._cipher.update(data);
    }

    final(): Buffer {
        return this._cipher.final();
    }

    /** Sets the authentication tag */
    setAuthTag(tag: Buffer): void {
        this._cipher.setAuthTag(tag);
    }
}
