import { expect } from "vitest";

import { GCMCipher, GCMDecipher } from "./cipher";

const KEY = Buffer.from("one 16B demo key");
const AAD = Buffer.from("some demo additional authenticated data");
const NONCE = Buffer.from("some nonce!!");
const NONCE_16B = Buffer.from("some 16B nonce!!");
const PLAINTEXT = Buffer.from("The quick brown fox jumps over the lazy dog.");

const CIPHERTEXT = Buffer.from(
    "c2b2d5ee163be7fad69d42b916e4c4a9f9a580c2cce51743b15d72399c41f7d95cec5cb07bafdd249b8afb95",
    "hex",
);
const TAG = Buffer.from("c7b4fb22bc5182d56b357aa48f09e5cf", "hex");
const TAG_AAD = Buffer.from("017659faab11e6cf703f7951e9235642", "hex");

const CIPHERTEXT_16B = Buffer.from(
    "215dcd5807217795d4605e648280783690a8ffe24cb3e2242ae8b027acab507ddf54b952a011535932c29d00",
    "hex",
);
const TAG_16B = Buffer.from("29a4eafb88ced40dcdb6de67a6545aed", "hex");

describe("GCMCipher", () => {
    it("should encrypt", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        const encrypted = cipher.update(PLAINTEXT);
        const authTag = cipher.digest();

        expect(Buffer.from(encrypted)).toEqual(CIPHERTEXT);
        expect(Buffer.from(authTag)).toEqual(TAG);
    });

    it("should encrypt using non-16-byte nonce", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE_16B);
        const encrypted = cipher.update(PLAINTEXT);
        const authTag = cipher.digest();

        expect(Buffer.from(encrypted)).toEqual(CIPHERTEXT_16B);
        expect(Buffer.from(authTag)).toEqual(TAG_16B);
    });

    it("should encrypt with AAD", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE, AAD);
        const encrypted = cipher.update(PLAINTEXT);
        const authTag = cipher.digest();

        expect(Buffer.from(encrypted)).toEqual(CIPHERTEXT);
        expect(Buffer.from(authTag)).toEqual(TAG_AAD);
    });

    it("should encrypt in chunks", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        const chunks = [PLAINTEXT.subarray(0, 5), PLAINTEXT.subarray(5, 10), PLAINTEXT.subarray(10)];
        const encrypted = Buffer.concat(chunks.map((chunk) => cipher.update(chunk)));
        const authTag = cipher.digest();

        expect(Buffer.from(encrypted)).toEqual(CIPHERTEXT);
        expect(Buffer.from(authTag)).toEqual(TAG);
    });

    it("should encrypt in chunks with AAD", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE, AAD);
        const chunks = [PLAINTEXT.subarray(0, 5), PLAINTEXT.subarray(5, 10), PLAINTEXT.subarray(10)];
        const encrypted = Buffer.concat(chunks.map((chunk) => cipher.update(chunk)));
        const authTag = cipher.digest();

        expect(Buffer.from(encrypted)).toEqual(CIPHERTEXT);
        expect(Buffer.from(authTag)).toEqual(TAG_AAD);
    });

    it("should throw if `digest()` called after cipher is finalized", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        cipher.digest();
        expect(() => cipher.digest()).toThrow("Cipher has already been finalized");
    });
});

describe("GCMDecipher", () => {
    it("should decrypt", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(TAG);
        const decrypted = decipher.update(CIPHERTEXT);
        decipher.verify();

        expect(Buffer.from(decrypted)).toEqual(PLAINTEXT);
    });

    it("should decrypt using non-16-byte nonce", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE_16B);
        decipher.setAuthTag(TAG_16B);
        const decrypted = decipher.update(CIPHERTEXT_16B);
        decipher.verify();

        expect(Buffer.from(decrypted)).toEqual(PLAINTEXT);
    });

    it("should decrypt with AAD", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE, AAD);
        decipher.setAuthTag(TAG_AAD);
        const decrypted = decipher.update(CIPHERTEXT);
        decipher.verify();

        expect(Buffer.from(decrypted)).toEqual(PLAINTEXT);
    });

    it("should decrypt in chunks", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(TAG);
        const chunks = [CIPHERTEXT.subarray(0, 5), CIPHERTEXT.subarray(5, 10), CIPHERTEXT.subarray(10)];
        const decrypted = Buffer.concat(chunks.map((chunk) => decipher.update(chunk)));
        decipher.verify();

        expect(Buffer.from(decrypted)).toEqual(PLAINTEXT);
    });

    it("should decrypt in chunks with AAD", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE, AAD);
        decipher.setAuthTag(TAG_AAD);
        const chunks = [CIPHERTEXT.subarray(0, 5), CIPHERTEXT.subarray(5, 10), CIPHERTEXT.subarray(10)];
        const decrypted = Buffer.concat(chunks.map((chunk) => decipher.update(chunk)));
        decipher.verify();

        expect(Buffer.from(decrypted)).toEqual(PLAINTEXT);
    });

    it("should throw if `verify()` called before `setAuthTag()`", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        expect(() => decipher.verify()).toThrow("Authentication tag not set");
    });

    it("should throw if authentication tag is invalid", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(Buffer.from("invalid tag"));
        expect(() => decipher.verify()).toThrow("Invalid authentication tag");
    });
});
