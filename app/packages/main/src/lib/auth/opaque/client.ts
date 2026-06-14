import randomBytes from "randombytes";

import {
    AuthRequest,
    AuthResponse,
    CleartextCredentials,
    CredentialRequest,
    CredentialResponse,
    Envelope,
    KE1,
    KE2,
    KE3,
    RegistrationRecord,
    RegistrationRequest,
    RegistrationResponse,
} from "@lib/auth/opaque/structures";
import HKDF from "@lib/crypto/hkdf";
import { xorBuffer } from "@lib/util";

import { i2osp } from "./misc";
import { OPRFRistrettoSHA512, OPRFType } from "./oprf";
import { Ristretto255 } from "./ristretto255";

export class OPAQUEAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OPAQUEAuthError";
    }
}

export class OPAQUEServerAuthError extends OPAQUEAuthError {
    constructor(message: string) {
        super(message);
        this.name = "OPAQUEServerAuthError";
    }
}

export class OPAQUEClient {
    // OPAQUE constants
    readonly NONCE_LENGTH = 32;
    readonly SEED_LENGTH = 32;

    // Main OPAQUE attributes
    oprf: typeof OPRFRistrettoSHA512;
    kdf: HKDF;
    private _ksf: (input: Uint8Array) => Uint8Array;
    context: Uint8Array;

    // Client state
    private _password: Uint8Array | null = null;
    private _blind: bigint | null = null;
    private _clientSecret: bigint | null = null;
    private _ke1: KE1 | null = null;

    constructor(
        oprfType: OPRFType = "ristretto255-sha512",
        ksf?: (input: Uint8Array) => Uint8Array,
        context?: Uint8Array,
    ) {
        this.context = context || new TextEncoder().encode("Excalibur");

        if (oprfType === "ristretto255-sha512") {
            this.oprf = OPRFRistrettoSHA512;
            this.kdf = new HKDF("sha512");
        } else {
            throw new Error("Unsupported OPRF type");
        }

        this._ksf = ksf || ((input: Uint8Array) => input); // Identity function as default
    }

    // Helper properties
    /**
     * @returns size of the registration response in bytes
     */
    get registrationResponseSize() {
        return (
            Ristretto255.KEY_LENGTH + // Evaluated element
            Ristretto255.KEY_LENGTH // Server public key
        );
    }

    /**
     * @returns size of the KE1 message in bytes
     */
    get ke1Size() {
        return (
            Ristretto255.KEY_LENGTH + // Blinded element
            this.NONCE_LENGTH + // Client nonce
            Ristretto255.KEY_LENGTH // Client public keyshare
        );
    }

    /**
     * @returns size of the KE2 message in bytes
     */
    get ke2Size() {
        const maskedResponseLength = Ristretto255.KEY_LENGTH + this.NONCE_LENGTH + this.kdf.digestSize;

        return (
            // Credential response
            Ristretto255.KEY_LENGTH + // Evaluated element
            this.NONCE_LENGTH + // Masking nonce
            maskedResponseLength + // Masked response
            // Authentication response
            this.NONCE_LENGTH +
            Ristretto255.KEY_LENGTH +
            this.kdf.digestSize
        );
    }

    // Helper functions
    /**
     * Implements the `Hash()` function described in section 2.3.
     *
     * @param data the data to hash
     * @returns the hash of the data
     */
    private _hash(data: Uint8Array): Buffer {
        return Buffer.from(this.oprf.hashfunc(data).digest());
    }

    /**
     * Create cleartext credentials for the server, following section 4's
     * `CreateCleartextCredentials()` function.

     * @param serverPublicKey the server's public key
     * @param clientPublicKey the client's public key
     * @param serverIdentity optional server's identity
     * @param clientIdentity optional client's identity
     * @returns the cleartext credentials
     */
    private _createCleartextCredentials(
        serverPublicKey: Ristretto255,
        clientPublicKey: Ristretto255,
        serverIdentity: Uint8Array,
        clientIdentity: Uint8Array,
    ): CleartextCredentials {
        if (serverIdentity.length === 0) {
            serverIdentity = serverPublicKey.toBytes();
        }
        if (clientIdentity.length === 0) {
            clientIdentity = clientPublicKey.toBytes();
        }

        return new CleartextCredentials(serverPublicKey, serverIdentity, clientIdentity);
    }

    /**
     * Computes an envelope, following section 4.1.2.
     *
     * We differ from the official implementation by returning the client private key and cleartext
     * credentials as well. This is to promote code reuse.
     *
     * @param randomizedPassword a randomized password
     * @param serverPublicKey the encoded server public key for the AKE protocol
     * @param serverIdentity the optional encoded server identity
     * @param clientIdentity the optional encoded client identity
     * @param envelopeNonce the optional nonce for the envelope
     * @returns the envelope, cleartext credentials, client's private key, client's public key,
     *      masking key, and export key
     */
    private _envelopeComputation(
        randomizedPassword: Uint8Array,
        serverPublicKey: Ristretto255,
        serverIdentity: Uint8Array,
        clientIdentity: Uint8Array,
        envelopeNonce?: Uint8Array,
    ): [Envelope, CleartextCredentials, bigint, Ristretto255, Uint8Array, Uint8Array] {
        envelopeNonce = envelopeNonce || randomBytes(this.NONCE_LENGTH);
        const randomizedPasswordBuffer = Buffer.from(randomizedPassword);

        const maskingKey = this.kdf.expand(randomizedPasswordBuffer, Buffer.from("MaskingKey"), this.kdf.digestSize);
        const authKey = this.kdf.expand(
            randomizedPasswordBuffer,
            Buffer.concat([envelopeNonce, Buffer.from("AuthKey")]),
            this.kdf.digestSize,
        );
        const exportKey = this.kdf.expand(
            randomizedPasswordBuffer,
            Buffer.concat([envelopeNonce, Buffer.from("ExportKey")]),
            this.kdf.digestSize,
        );
        const seed = this.kdf.expand(
            randomizedPasswordBuffer,
            Buffer.concat([envelopeNonce, Buffer.from("PrivateKey")]),
            this.SEED_LENGTH,
        );
        const [clientPrivateKey, clientPublicKey] = this._deriveDiffieHellmanKeyPair(seed);

        const cleartextCredentials = this._createCleartextCredentials(
            serverPublicKey,
            clientPublicKey,
            serverIdentity,
            clientIdentity,
        );

        const authTag = this.kdf.hmacHash(authKey, Buffer.concat([envelopeNonce, cleartextCredentials.serialize()]));

        const envelope = new Envelope(envelopeNonce, authTag);
        return [envelope, cleartextCredentials, clientPrivateKey, clientPublicKey, maskingKey, exportKey];
    }

    /**
     * Creates an envelope at registration, following section 4.1.2.
     *
     * @param randomizedPassword a randomized password
     * @param serverPublicKey the encoded server public key for the AKE protocol
     * @param serverIdentity the optional encoded server identity
     * @param clientIdentity the optional encoded client identity
     * @param envelopeNonce optional nonce for the envelope
     * @returns the envelope, client's public key, masking key, and export key
     */
    private _store(
        randomizedPassword: Uint8Array,
        serverPublicKey: Ristretto255,
        serverIdentity: Uint8Array,
        clientIdentity: Uint8Array,
        envelopeNonce?: Uint8Array,
    ): [Envelope, Ristretto255, Uint8Array, Uint8Array] {
        const [envelope, _cleartextCredentials, _clientPrivateKey, clientPublicKey, maskingKey, exportKey] =
            this._envelopeComputation(
                randomizedPassword,
                serverPublicKey,
                serverIdentity,
                clientIdentity,
                envelopeNonce,
            );
        return [envelope, clientPublicKey, maskingKey, exportKey];
    }

    /**
     * Recovers data from the envelope structure, as described in section 4.1.3.

     * @param randomizedPassword a randomized password
     * @param serverPublicKey the encoded server public key for the AKE protocol
     * @param envelope the client's Envelope structure
     * @param serverIdentity the optional encoded server identity
     * @param clientIdentity the optional encoded client identity
     * @returns the client's private key, cleartext credentials, and the `export_key`
     * @throws {OPAQUEAuthError} if the Envelope fails to be recovered (e.g., envelope auth tag mismatch)
     */
    private _recover(
        randomizedPassword: Uint8Array,
        serverPublicKey: Ristretto255,
        envelope: Envelope,
        serverIdentity: Uint8Array,
        clientIdentity: Uint8Array,
    ): [bigint, CleartextCredentials, Uint8Array] {
        // The first part of section 4.1.3's code is identical to section 4.1.2, so we can reuse code
        const [expectedEnvelope, cleartextCredentials, clientPrivateKey, _clientPublicKey, _maskingKey, exportKey] =
            this._envelopeComputation(
                randomizedPassword,
                serverPublicKey,
                serverIdentity,
                clientIdentity,
                envelope.envelopeNonce,
            );

        if (!Buffer.from(envelope.authTag).equals(Buffer.from(expectedEnvelope.authTag))) {
            throw new OPAQUEAuthError("envelope authentication tag does not match expected tag");
        }

        return [clientPrivateKey, cleartextCredentials, exportKey];
    }

    /**
     * Create a credential request for the given password, as described in section 6.3.2.1.
     *
     * @param password the password to create a credential request for
     * @param blind optional blind to use for the credential request
     * @returns a tuple of the credential request and the blind
     */
    private _createCredentialRequest(password: Uint8Array, blind?: bigint): [CredentialRequest, bigint] {
        // It turns out this function is exactly the same as the `createRegistrationRequest()` function, so we just
        // reuse it
        const [registration_request, blindValue] = this.createRegistrationRequest(password, blind);
        return [new CredentialRequest(registration_request.blindedElement), blindValue];
    }

    /**
     * Process the server's `CredentialResponse` message and produce the client's private key,
     * server public key, and the `export_key`, as described in section 6.3.2.3.
     *
     * @param password an opaque byte string containing the client's password
     * @param blind OPRF blinding scalar value
     * @param response the server's `CredentialResponse` message
     * @param serverIdentity optional server's identity
     * @param clientIdentity the client's identity
     * @return the client's private key, cleartext credentials, and the `export_key`
     * @throws {OPAQUEAuthError} if the server public key is invalid (could be caused by incorrect credentials)
     * @throws {OPAQUEAuthError} if the Envelope fails to be recovered (e.g., envelope auth tag mismatch)
     */
    private _recoverCredentials(
        password: Uint8Array,
        blind: bigint,
        response: CredentialResponse,
        serverIdentity: Uint8Array,
        clientIdentity: Uint8Array,
    ): [bigint, CleartextCredentials, Uint8Array] {
        const evaluatedElement = response.evaluatedElement;

        const oprfOutput = this.oprf.finalize(password, blind, evaluatedElement);
        const stretchedOPRFOutput = this._ksf(oprfOutput);

        const randomizedPassword = this.kdf.extract(null, Buffer.concat([oprfOutput, stretchedOPRFOutput]));

        const maskingKey = this.kdf.expand(randomizedPassword, Buffer.from("MaskingKey"), this.kdf.digestSize);

        const credentialResponsePad = this.kdf.expand(
            maskingKey,
            Buffer.concat([response.maskingNonce, Buffer.from("CredentialResponsePad")]),
            Ristretto255.KEY_LENGTH + this.NONCE_LENGTH + this.kdf.digestSize,
        );

        const serverPublicKeyAndEnvelope = xorBuffer(credentialResponsePad, Buffer.from(response.maskedResponse));
        let serverPublicKey: Ristretto255;
        try {
            serverPublicKey = Ristretto255.fromBytes(serverPublicKeyAndEnvelope.subarray(0, Ristretto255.KEY_LENGTH));
        } catch (_e) {
            throw new OPAQUEAuthError("failed to recover server public key");
        }
        const envelope = Envelope.deserialize(
            serverPublicKeyAndEnvelope.subarray(Ristretto255.KEY_LENGTH),
            this.NONCE_LENGTH,
        );

        const [clientPrivateKey, cleartextCredentials, exportKey] = this._recover(
            randomizedPassword,
            serverPublicKey,
            envelope,
            serverIdentity,
            clientIdentity,
        );

        return [clientPrivateKey, cleartextCredentials, exportKey];
    }

    /**
     * Derive a Diffie-Hellman keypair from a seed, as described in section 6.4.1.1.
     *
     * @param seed the seed to derive the keypair from
     * @returns a tuple of the private key and the public key
     */
    private _deriveDiffieHellmanKeyPair(seed: Uint8Array): [bigint, Ristretto255] {
        const info = new TextEncoder().encode("OPAQUE-DeriveDiffieHellmanKeyPair");
        return this.oprf.generateKeys(seed, info) as [bigint, Ristretto255];
    }

    /**
     * Performs the Diffie-Hellman operation between the private input `k` and public input `b` as
     * described in section 6.4.1.1, with validation as required in section 10.7.
     *
     * We differ from the specification by returning the base curve element instead of its
     * serialized form.
     *
     * @param k the private input
     * @param b the public input
     * @throws {OPAQUEAuthError} if the shared secret is the point at infinity
     * @returns the shared secret
     */
    private _diffieHellman(k: bigint, b: Ristretto255): Ristretto255 {
        const sharedSecret = b.mul(k);
        if (sharedSecret.isIdentity()) {
            throw new OPAQUEAuthError("Diffie-Hellman shared secret is the point at infinity");
        }
        return sharedSecret;
    }

    /**
     * Implements the `Expand-Label()` function in section 6.4.2.1.
     *
     * @param secret the secret to expand
     * @param label the label to use
     * @param context the context to use
     * @param length the length of the expanded secret
     * @returns the expanded secret
     */
    private _expandLabel(secret: Buffer, label: Uint8Array, context: Uint8Array, length: number): Uint8Array {
        const opaqueLabel = Buffer.concat([Buffer.from("OPAQUE-"), label]);
        const customLabel = Buffer.concat([
            i2osp(BigInt(length), 2),
            i2osp(BigInt(opaqueLabel.length), 1),
            opaqueLabel,
            i2osp(BigInt(context.length), 1),
            context,
        ]);

        return this.kdf.expand(secret, customLabel, length);
    }

    /**
     * Implements the `Derive-Secret()` function in section 6.4.2.1.
     *
     * @param secret the secret to derive
     * @param label the label to use
     * @param transcript_hash the transcript hash to use
     * @returns the derived secret
     */
    private _deriveSecret(secret: Uint8Array, label: Uint8Array, transcriptHash: Uint8Array | null): Uint8Array {
        return this._expandLabel(Buffer.from(secret), label, transcriptHash ?? Buffer.alloc(0), this.kdf.digestSize);
    }

    /**
     * Generates the preamble string for the key scheduling, following section 6.4.2.1's
     * `Preamble()` function.
     *
     * @param clientIdentity the client's identity
     * @param ke1 the KE1 message
     * @param serverIdentity the server's identity
     * @param credentialResponse the credential response
     * @param serverNonce the server's nonce
     * @param serverPublicKeyshare the server's public keyshare
     * @returns the preamble string, the protocol transcript with identities and messages
     */
    private _generatePreamble(
        clientIdentity: Uint8Array,
        ke1: KE1,
        serverIdentity: Uint8Array,
        credentialResponse: CredentialResponse,
        serverNonce: Uint8Array,
        serverPublicKeyshare: Ristretto255,
    ): Uint8Array {
        return Buffer.concat([
            Buffer.from("OPAQUEv1-"),
            i2osp(BigInt(this.context.length), 2),
            this.context,
            i2osp(BigInt(clientIdentity.length), 2),
            clientIdentity,
            ke1.serialize(),
            i2osp(BigInt(serverIdentity.length), 2),
            serverIdentity,
            credentialResponse.serialize(),
            serverNonce,
            serverPublicKeyshare.toBytes(),
        ]);
    }

    /**
     * Derives the session keys from the shared secret, following section 6.4.2.2's
     * `DeriveKeys()` function.
     *
     * @param ikm the shared secret
     * @param preamble the preamble string
     * @returns the `km2`, `km3`, and `session_key` values
     */
    private _deriveKeys(ikm: Uint8Array, preamble: Uint8Array): [Buffer, Buffer, Uint8Array] {
        const prk = this.kdf.extract(null, Buffer.from(ikm));

        const preambleHash = this._hash(preamble);
        const handshakeSecret = this._deriveSecret(prk, Buffer.from("HandshakeSecret"), preambleHash);
        const sessionKey = this._deriveSecret(prk, Buffer.from("SessionKey"), preambleHash);
        const km2 = this._deriveSecret(handshakeSecret, Buffer.from("ServerMAC"), null);
        const km3 = this._deriveSecret(handshakeSecret, Buffer.from("ClientMAC"), null);

        return [Buffer.from(km2), Buffer.from(km3), sessionKey];
    }

    /**
     * Start the authentication process, as described in section 6.4.3.
     *
     * @param credentialRequest the credential request to start the authentication with
     * @param nonce optional nonce to use for the authentication
     * @param keyshareSeed optional keyshare seed to use for the authentication
     * @returns the KE1 message to send to the server
     */
    private _authClientStart(credentialRequest: CredentialRequest, nonce?: Uint8Array, keyshareSeed?: Uint8Array): KE1 {
        nonce = nonce || randomBytes(this.NONCE_LENGTH);
        keyshareSeed = keyshareSeed || randomBytes(this.SEED_LENGTH);

        const [secret, publicKeyshare] = this._deriveDiffieHellmanKeyPair(keyshareSeed);

        const authRequest = new AuthRequest(nonce, publicKeyshare);
        const ke1 = new KE1(credentialRequest, authRequest);

        this._clientSecret = secret;
        this._ke1 = ke1;
        return ke1;
    }

    /**
     * Create a KE3 message and output session_key using the server's KE2 message and recovered
     * credential information, as described in section 6.4.3.
     *
     * @param cleartextCredentials a CleartextCredentials structure
     * @param clientPrivateKey the client's private key
     * @param ke2 a KE2 message structure
     * @returns the KE3 message to send to the server and the shared session secret
     * @throws {OPAQUEAuthError} if the shared secret is the point at infinity
     * @throws {OPAQUEAuthError} if the server authentication fails
     */
    private _authClientFinalize(
        cleartextCredentials: CleartextCredentials,
        clientPrivateKey: bigint,
        ke2: KE2,
    ): [KE3, Uint8Array] {
        const dh1 = this._diffieHellman(this._clientSecret!, ke2.authResponse.serverPublicKeyshare);
        const dh2 = this._diffieHellman(this._clientSecret!, cleartextCredentials.serverPublicKey);
        const dh3 = this._diffieHellman(clientPrivateKey, ke2.authResponse.serverPublicKeyshare);
        const ikm = Buffer.concat([dh1.toBytes(), dh2.toBytes(), dh3.toBytes()]);

        const preamble = this._generatePreamble(
            cleartextCredentials.clientIdentity,
            this._ke1!,
            cleartextCredentials.serverIdentity,
            ke2.credentialResponse,
            ke2.authResponse.serverNonce,
            ke2.authResponse.serverPublicKeyshare,
        );
        const [km2, km3, sessionKey] = this._deriveKeys(ikm, preamble);
        const expectedServerMAC = this.kdf.hmacHash(km2, this._hash(preamble));

        if (!Buffer.from(ke2.authResponse.serverMAC).equals(Buffer.from(expectedServerMAC))) {
            throw new OPAQUEAuthError("failed to authenticate server");
        }

        const clientMAC = this.kdf.hmacHash(km3, this._hash(Buffer.concat([preamble, expectedServerMAC])));
        return [new KE3(clientMAC), sessionKey];
    }

    // Main functions
    /**
     * Create a registration request to send to the server, following section 5.2.1.
     *
     * @param password the password to use for the registration
     * @param blind optional blind to use for the registration
     * @returns a tuple containing the registration request and the blind used for the registration
     */
    createRegistrationRequest(password: Uint8Array, blind?: bigint): [RegistrationRequest, bigint] {
        const [blindValue, blindedElement] = this.oprf.blind(password, blind);
        return [new RegistrationRequest(blindedElement), blindValue];
    }

    /**
     * Finalizes the registration request and generates the registration record for the server to
     * keep, following section 5.2.3.
     *
     * @param password the password to use for the registration
     * @param blind the blind used for the registration
     * @param response the response from the server
     * @param serverIdentity the server identity
     * @param clientIdentity the client identity
     * @param envelopeNonce optional nonce to use for the envelope
     * @returns a tuple containing the registration record and the export key
     */
    finalizeRegistrationRequest(
        password: Uint8Array,
        blind: bigint,
        response: RegistrationResponse,
        serverIdentity: Uint8Array,
        clientIdentity: Uint8Array,
        envelopeNonce?: Uint8Array,
    ): [RegistrationRecord, Uint8Array] {
        const evaluatedElement = response.evaluatedElement;

        const oprfOutput = this.oprf.finalize(password, blind, evaluatedElement);
        const stretchedOPRFOutput = this._ksf(oprfOutput);

        const randomizedPassword = this.kdf.extract(null, Buffer.concat([oprfOutput, stretchedOPRFOutput]));

        const [envelope, clientPublicKey, maskingKey, exportKey] = this._store(
            randomizedPassword,
            response.serverPublicKey,
            serverIdentity,
            clientIdentity,
            envelopeNonce,
        );

        const record = new RegistrationRecord(clientPublicKey, maskingKey, envelope);
        return [record, exportKey];
    }

    /**
     * Generate the KE1 message to send to the server.
     *
     * @param password the password to use for the authentication
     * @param blind optional blind to use for the authentication
     * @param nonce optional nonce to use for the authentication
     * @param keyshareSeed optional keyshare seed to use for the authentication
     * @returns the client's KE1 message
     */
    generateKE1(password: Uint8Array, blind?: bigint, nonce?: Uint8Array, keyshareSeed?: Uint8Array): KE1 {
        const [request, blindValue] = this._createCredentialRequest(password, blind);
        this._password = password;
        this._blind = blindValue;
        const ke1 = this._authClientStart(request, nonce, keyshareSeed);
        return ke1;
    }

    /**
     * Generate the KE3 message to send to the server.
     *
     * @param clientIdentity the client's identity
     * @param serverIdentity the server's identity
     * @param ke2 the KE2 message from the server
     * @returns the client's KE3 message, the session key, and the export key
     * @throws {OPAQUEAuthError} if the server public key is invalid (could be caused by incorrect
     *      credentials)
     * @throws {OPAQUEAuthError} if the Envelope fails to be recovered (e.g., envelope auth tag
     *      mismatch)
     * @throws {OPAQUEAuthError} if the shared secret is the point at infinity
     * @throws {OPAQUEServerAuthError} if the server authentication fails
     */
    generateKE3(clientIdentity: Uint8Array, serverIdentity: Uint8Array, ke2: KE2): [KE3, Uint8Array, Uint8Array] {
        const [clientPrivateKey, cleartextCredentials, exportKey] = this._recoverCredentials(
            this._password!,
            this._blind!,
            ke2.credentialResponse,
            serverIdentity,
            clientIdentity,
        );
        const [ke3, sessionKey] = this._authClientFinalize(cleartextCredentials, clientPrivateKey, ke2);
        return [ke3, sessionKey, exportKey];
    }

    // Deserialization methods
    /**
     * Deserializes a registration request from raw bytes.
     *
     * @param registrationRequestRaw the raw bytes of the registration request
     * @returns the deserialized registration request
     */
    deserializeRegistrationRequest(registrationRequestRaw: Uint8Array): RegistrationRequest {
        return new RegistrationRequest(Ristretto255.fromBytes(registrationRequestRaw));
    }

    /**
     * Deserializes a registration response from raw bytes.
     *
     * @param registrationResponseRaw the raw bytes of the registration response
     * @returns the deserialized registration response
     */
    deserializeRegistrationResponse(registrationResponseRaw: Uint8Array): RegistrationResponse {
        const evaluatedElementRaw = registrationResponseRaw.slice(0, Ristretto255.KEY_LENGTH);
        const serverPublicKeyRaw = registrationResponseRaw.slice(
            Ristretto255.KEY_LENGTH,
            this.registrationResponseSize,
        );

        return new RegistrationResponse(
            Ristretto255.fromBytes(evaluatedElementRaw),
            Ristretto255.fromBytes(serverPublicKeyRaw),
        );
    }

    /**
     * Deserializes a KE1 message from raw bytes.
     *
     * @param ke1Raw the raw bytes of the KE1 message
     * @returns the deserialized KE1 message
     */
    deserializeKE1(ke1Raw: Uint8Array): KE1 {
        // The first part is the credential request, which consists of the OPRF blinded message
        const blindedElement = Ristretto255.fromBytes(ke1Raw.slice(0, Ristretto255.KEY_LENGTH));
        const credentialRequest = new CredentialRequest(blindedElement);

        // Then we have the auth request, consisting of a client nonce and public keyshare
        const clientNonce = ke1Raw.slice(Ristretto255.KEY_LENGTH, Ristretto255.KEY_LENGTH + this.NONCE_LENGTH);
        const clientPublicKeyshare = Ristretto255.fromBytes(
            ke1Raw.slice(Ristretto255.KEY_LENGTH + this.NONCE_LENGTH, this.ke1Size),
        );
        const authRequest = new AuthRequest(clientNonce, clientPublicKeyshare);

        return new KE1(credentialRequest, authRequest);
    }

    /**
     * Deserializes a KE2 message from raw bytes.
     *
     * @param ke2Raw the raw bytes of the KE2 message
     * @returns the deserialized KE2 message
     */
    deserializeKE2(ke2Raw: Uint8Array): KE2 {
        // First part is the credential response
        const evaluatedElement = Ristretto255.fromBytes(ke2Raw.slice(0, Ristretto255.KEY_LENGTH));
        const maskingNonce = ke2Raw.slice(Ristretto255.KEY_LENGTH, Ristretto255.KEY_LENGTH + this.NONCE_LENGTH);

        const maskedNonceLength = Ristretto255.KEY_LENGTH + this.NONCE_LENGTH + this.kdf.digestSize;
        const maskedResponse = ke2Raw.slice(
            Ristretto255.KEY_LENGTH + this.NONCE_LENGTH,
            Ristretto255.KEY_LENGTH + this.NONCE_LENGTH + maskedNonceLength,
        );

        const credentialResponse = new CredentialResponse(evaluatedElement, maskingNonce, maskedResponse);
        const credentialResponseLength = credentialResponse.serialize().length;

        // Then we have the auth response, consisting of a server nonce, public keyshare, and server MAC
        const serverNonce = ke2Raw.slice(credentialResponseLength, credentialResponseLength + this.NONCE_LENGTH);
        const serverPublicKeyshare = Ristretto255.fromBytes(
            ke2Raw.slice(
                credentialResponseLength + this.NONCE_LENGTH,
                credentialResponseLength + this.NONCE_LENGTH + Ristretto255.KEY_LENGTH,
            ),
        );
        const serverMAC = ke2Raw.slice(
            credentialResponseLength + this.NONCE_LENGTH + Ristretto255.KEY_LENGTH,
            this.ke2Size,
        );
        const authResponse = new AuthResponse(serverNonce, serverPublicKeyshare, serverMAC);

        return new KE2(credentialResponse, authResponse);
    }

    /**
     * Deserializes a KE3 message from raw bytes.
     *
     * @param ke3Raw the raw bytes of the KE3 message
     * @returns the deserialized KE3 message
     */
    deserializeKE3(ke3Raw: Uint8Array): KE3 {
        return new KE3(ke3Raw);
    }
}
