import { i2osp } from "./misc";
import { Ristretto255 } from "./ristretto255";

export class CleartextCredentials {
    serverPublicKey: Ristretto255;
    serverIdentity: Uint8Array;
    clientIdentity: Uint8Array;

    constructor(serverPublicKey: Ristretto255, serverIdentity: Uint8Array, clientIdentity: Uint8Array) {
        this.serverPublicKey = serverPublicKey;
        this.serverIdentity = serverIdentity;
        this.clientIdentity = clientIdentity;
    }

    serialize(): Uint8Array {
        return Buffer.concat([
            this.serverPublicKey.toBytes(),
            i2osp(BigInt(this.serverIdentity.length), 2),
            this.serverIdentity,
            i2osp(BigInt(this.clientIdentity.length), 2),
            this.clientIdentity,
        ]);
    }
}
/**
 * Envelope structure as defined in section 4.1.1.
 */
export class Envelope {
    envelopeNonce: Uint8Array;
    authTag: Uint8Array;

    constructor(envelopeNonce: Uint8Array, authTag: Uint8Array) {
        this.envelopeNonce = envelopeNonce;
        this.authTag = authTag;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.envelopeNonce, ...this.authTag]);
    }

    static deserialize(data: Uint8Array, nonceLength: number): Envelope {
        return new Envelope(data.slice(0, nonceLength), data.slice(nonceLength));
    }
}

/**
 * A client registration request structure as defined in section 5.1.
 */
export class RegistrationRequest {
    blindedElement: Ristretto255;

    constructor(blindedElement: Ristretto255) {
        this.blindedElement = blindedElement;
    }

    serialize(): Uint8Array {
        return this.blindedElement.toBytes();
    }
}

/**
 * A server registration response structure as defined in section 5.1.
 */
export class RegistrationResponse {
    evaluatedElement: Ristretto255;
    serverPublicKey: Ristretto255;

    constructor(evaluatedElement: Ristretto255, serverPublicKey: Ristretto255) {
        this.evaluatedElement = evaluatedElement;
        this.serverPublicKey = serverPublicKey;
    }
}

/**
 * A registration record structure as defined in section 5.1.
 */
export class RegistrationRecord {
    clientPublicKey: Ristretto255;
    maskingKey: Uint8Array;
    envelope: Envelope;

    constructor(clientPublicKey: Ristretto255, maskingKey: Uint8Array, envelope: Envelope) {
        this.clientPublicKey = clientPublicKey;
        this.maskingKey = maskingKey;
        this.envelope = envelope;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.clientPublicKey.toBytes(), ...this.maskingKey, ...this.envelope.serialize()]);
    }
}

/**
 * A client authentication request structure as defined in section 6.1.
 */
export class AuthRequest {
    clientNonce: Uint8Array;
    clientPublicKeyshare: Ristretto255;

    constructor(clientNonce: Uint8Array, clientPublicKeyshare: Ristretto255) {
        this.clientNonce = clientNonce;
        this.clientPublicKeyshare = clientPublicKeyshare;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.clientNonce, ...this.clientPublicKeyshare.toBytes()]);
    }
}

/**
 * A server authentication response structure as defined in section 6.1.
 */
export class AuthResponse {
    serverNonce: Uint8Array;
    serverPublicKeyshare: Ristretto255;
    serverMAC: Uint8Array;

    constructor(serverNonce: Uint8Array, serverPublicKeyshare: Ristretto255, serverMac: Uint8Array) {
        this.serverNonce = serverNonce;
        this.serverPublicKeyshare = serverPublicKeyshare;
        this.serverMAC = serverMac;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.serverNonce, ...this.serverPublicKeyshare.toBytes(), ...this.serverMAC]);
    }
}

/**
 * A client credential request structure as defined in section 6.3.1.
 */
export class CredentialRequest extends RegistrationRequest {
    // From RFC9807, this structure is exactly the same as `RegistrationRequest`
}

/**
 * A server credential response structure as defined in section 6.3.1.
 */
export class CredentialResponse {
    evaluatedElement: Ristretto255;
    maskingNonce: Uint8Array;
    maskedResponse: Uint8Array;

    constructor(evaluatedElement: Ristretto255, maskingNonce: Uint8Array, maskedResponse: Uint8Array) {
        this.evaluatedElement = evaluatedElement;
        this.maskingNonce = maskingNonce;
        this.maskedResponse = maskedResponse;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.evaluatedElement.toBytes(), ...this.maskingNonce, ...this.maskedResponse]);
    }
}

/**
 * Key exchange message 1 structure as defined in section 6.1.
 */
export class KE1 {
    credentialRequest: CredentialRequest;
    authRequest: AuthRequest;

    constructor(credentialRequest: CredentialRequest, authRequest: AuthRequest) {
        this.credentialRequest = credentialRequest;
        this.authRequest = authRequest;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.credentialRequest.serialize(), ...this.authRequest.serialize()]);
    }
}

/**
 * Key exchange message 2 structure as defined in section 6.1.
 */
export class KE2 {
    credentialResponse: CredentialResponse;
    authResponse: AuthResponse;

    constructor(credentialResponse: CredentialResponse, authResponse: AuthResponse) {
        this.credentialResponse = credentialResponse;
        this.authResponse = authResponse;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.credentialResponse.serialize(), ...this.authResponse.serialize()]);
    }
}

/**
 * Key exchange message 3 structure as defined in section 6.1.
 */
export class KE3 {
    clientMac: Uint8Array;

    constructor(clientMac: Uint8Array) {
        this.clientMac = clientMac;
    }

    serialize(): Uint8Array {
        return new Uint8Array([...this.clientMac]);
    }
}
