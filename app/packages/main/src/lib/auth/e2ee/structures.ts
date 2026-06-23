import { SlowHashFunction } from "@lib/crypto/keygen";

export interface HandshakeData {
    /** Bilaterally agreed symmetric key to encrypt communications */
    key: Buffer;
    /** Authentication token */
    token: string;
}

export interface E2EEData extends HandshakeData {
    /** Key generation function used to generate the AUK */
    keygenFunction: SlowHashFunction;
    /** Account unlock key (AUK) */
    auk: Buffer;
}
