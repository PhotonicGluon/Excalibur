interface RawAdditionalUserInfo {
    /** Whether item names are obfuscated */
    obfuscatedNames: boolean;
}

export type AdditionalUserInfo = Partial<RawAdditionalUserInfo>;
