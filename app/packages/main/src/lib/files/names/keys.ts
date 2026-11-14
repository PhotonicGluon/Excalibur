import HKDF from "@lib/crypto/hkdf";
import { uuidToBytes } from "@lib/util";

export class NameKeys {
    private _vaultKey: Buffer;
    private _userID: Buffer;

    /** Name Encryption Key */
    public enc: Buffer;
    /** Name Tag Key */
    public tag: Buffer;

    /**
     * Creates keys for use in encrypting item names.
     *
     * @param vaultKey the vault key
     * @param userID the user ID, expressed in either a UUID string or bytes
     */
    constructor(vaultKey: Buffer, userID: string | Buffer) {
        this._vaultKey = vaultKey;
        if (typeof userID === "string") {
            userID = uuidToBytes(userID);
        }
        this._userID = userID;

        this.enc = this._deriveNameKey("Name Encryption Key");
        this.tag = this._deriveNameKey("Name Tag Key");
    }

    // Helper methods
    /**
     * Derives a name key from the vault key and user ID.
     *
     * @param info the info string to use for the HKDF
     * @returns the derived key
     */
    private _deriveNameKey(info: string) {
        return new HKDF("sha256").hkdf(this._vaultKey, this._userID, Buffer.from("Excalibur Names v1 - " + info), 32);
    }
}
