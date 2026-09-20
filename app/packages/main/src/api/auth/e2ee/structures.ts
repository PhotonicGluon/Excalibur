export interface E2EEData {
    /** Bilaterally agreed symmetric key to encrypt communications */
    key: Buffer;
    /** Authentication token */
    token: string;
    /** Maximum file size that can be uploaded, in bytes */
    maxUploadSize: number;
    /** Time offset of the server relative to the client, in milliseconds */
    timeOffset: number;
}
