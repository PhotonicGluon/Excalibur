import HKDF from "@lib/crypto/hkdf";

export class MerkleKeys {
    private _vaultKey: Buffer;
    private _userID: Buffer;

    /** Content MAC Key */
    public content: Buffer;

    /**
     * Creates keys for use in a Merkle tree.
     *
     * @param vaultKey the vault key
     * @param userID the user ID, expressed in bytes instead of a UUID
     */
    constructor(vaultKey: Buffer, userID: Buffer) {
        this._vaultKey = vaultKey;
        this._userID = userID;

        this.content = this._deriveMerkleKey("Content MAC Key");
    }

    // Helper methods
    /**
     * Derives a Merkle key from the vault key and user ID.
     *
     * @param info the info string to use for the HKDF
     * @returns the derived key
     */
    private _deriveMerkleKey(info: string) {
        return new HKDF("sha256").hkdf(this._vaultKey, this._userID, Buffer.from("Excalibur Merkle v1 - " + info), 32);
    }
}
