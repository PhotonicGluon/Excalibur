interface RawUserVaultInfo {
    /** Whether item names are obfuscated */
    obfuscatedNames: boolean;
}

export type UserVaultInfo = Partial<RawUserVaultInfo>;

export interface VaultInfo {
    /** Account unlock key */
    auk: Buffer;
    /** Vault key */
    key: Buffer;
    /** Additional user vault information */
    info: UserVaultInfo;
}
