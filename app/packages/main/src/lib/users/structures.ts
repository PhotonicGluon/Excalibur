import { KeyGenAlgorithm } from "@lib/crypto/keygen";
import { MerkleKeys } from "@lib/merkle/keys";

interface RawUserVaultInfo {
    /** Whether item names are obfuscated */
    obfuscatedNames: boolean;
}

export type UserVaultInfo = Partial<RawUserVaultInfo>;

export interface VaultInfo {
    /** Key generation algorithm */
    keygenAlgorithm: KeyGenAlgorithm;
    /** Account unlock key salt */
    aukSalt: Buffer;
    /** Encrypted vault key */
    encryptedKey: Buffer;
    /** Vault key */
    key: Buffer;
    /** Keys that are used within the Merkle tree verification process */
    merkleKeys: MerkleKeys;
    /** Additional user vault information */
    info: UserVaultInfo;
}
