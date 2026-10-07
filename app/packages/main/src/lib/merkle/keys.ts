import HKDF from "@lib/crypto/hkdf";
import { uuidToBytes } from "@lib/util";

export class MerkleKeys {
    private _vaultKey: Buffer;
    private _userID: Buffer;

    /** Content MAC Key */
    public content: Buffer;
    /** Node Hash Key */
    public nodeHash: Buffer;
    /** Attestation Key */
    public attestation: Buffer;

    /**
     * Creates keys for use in a Merkle tree.
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

        this.content = this._deriveMerkleKey("Content MAC Key");
        this.nodeHash = this._deriveMerkleKey("Node Hash Key");
        this.attestation = this._deriveMerkleKey("Attestation Key");
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
