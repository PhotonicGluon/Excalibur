export interface HandshakeData {
    /** Bilaterally agreed symmetric key to encrypt communications */
    key: Buffer;
    /** Authentication token */
    token: string;
}

export interface E2EEData extends HandshakeData {
    /** Account unlock key (AUK) */
    auk: Buffer;
}
