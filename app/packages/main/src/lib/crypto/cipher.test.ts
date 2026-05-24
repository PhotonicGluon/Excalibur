import { expect } from "vitest";
import { GCMCipher, GCMDecipher } from "./cipher";

const KEY = Buffer.from("one 16B demo key");
const NONCE = Buffer.from("some nonce!!");
const PLAINTEXT = Buffer.from("The quick brown fox jumps over the lazy dog.");
const CIPHERTEXT = Buffer.from(
    "c2b2d5ee163be7fad69d42b916e4c4a9f9a580c2cce51743b15d72399c41f7d95cec5cb07bafdd249b8afb95",
    "hex",
);
const TAG = Buffer.from("c7b4fb22bc5182d56b357aa48f09e5cf", "hex");

describe("GCMCipher", () => {
    it("should encrypt", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        const encrypted = Buffer.concat([cipher.update(PLAINTEXT), cipher.final()]);
        const authTag = cipher.getAuthTag();

        expect(encrypted).toEqual(CIPHERTEXT);
        expect(Buffer.from(authTag)).toEqual(TAG);
    });

    it("should encrypt in chunks", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        const chunks = [PLAINTEXT.subarray(0, 5), PLAINTEXT.subarray(5, 10), PLAINTEXT.subarray(10)];
        const encrypted = Buffer.concat(chunks.map((chunk) => cipher.update(chunk)).concat(cipher.final()));
        const authTag = cipher.getAuthTag();

        expect(encrypted).toEqual(CIPHERTEXT);
        expect(Buffer.from(authTag)).toEqual(TAG);
    });

    it("should throw if `getAuthTag()` called before `final()`", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        expect(() => cipher.getAuthTag()).toThrow("Cipher has not been finalized");
    });
});

describe("GCMDecipher", () => {
    it("should decrypt", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(TAG);
        const decrypted = Buffer.concat([decipher.update(CIPHERTEXT), decipher.final()]);

        expect(decrypted).toEqual(PLAINTEXT);
    });

    it("should decrypt in chunks", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(TAG);
        const chunks = [CIPHERTEXT.subarray(0, 5), CIPHERTEXT.subarray(5, 10), CIPHERTEXT.subarray(10)];
        const decrypted = Buffer.concat(chunks.map((chunk) => decipher.update(chunk)).concat(decipher.final()));

        expect(decrypted).toEqual(PLAINTEXT);
    });

    it("should throw if `final()` called before `setAuthTag()`", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        expect(() => decipher.final()).toThrow("Authentication tag not set");
    });

    it("should throw if authentication tag is invalid", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(Buffer.from("invalid tag"));
        expect(() => decipher.final()).toThrow("Invalid authentication tag");
    });
});
