export interface E2EEData {
    /** Bilaterally agreed symmetric key to encrypt communications */
    key: Buffer;
    /** Authentication token */
    token: string;
}
