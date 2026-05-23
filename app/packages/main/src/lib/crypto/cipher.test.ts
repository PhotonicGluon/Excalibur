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
        const encrypted = cipher.update(PLAINTEXT);
        cipher.final();
        const authTag = cipher.getAuthTag();

        expect(encrypted).toEqual(CIPHERTEXT);
        expect(authTag).toEqual(TAG);
    });

    it("should encrypt in chunks", () => {
        const cipher = new GCMCipher("aes-128-gcm", KEY, NONCE);
        const chunks = [PLAINTEXT.subarray(0, 5), PLAINTEXT.subarray(5, 10), PLAINTEXT.subarray(10)];
        const encrypted = chunks.map((chunk) => cipher.update(chunk));
        cipher.final();
        const authTag = cipher.getAuthTag();

        expect(Buffer.concat(encrypted)).toEqual(CIPHERTEXT);
        expect(authTag).toEqual(TAG);
    });
});

describe("GCMDecipher", () => {
    it("should decrypt", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(TAG);
        const decrypted = decipher.update(CIPHERTEXT);
        decipher.final();

        expect(decrypted).toEqual(PLAINTEXT);
    });

    it("should decrypt in chunks", () => {
        const decipher = new GCMDecipher("aes-128-gcm", KEY, NONCE);
        decipher.setAuthTag(TAG);
        const chunks = [CIPHERTEXT.subarray(0, 5), CIPHERTEXT.subarray(5, 10), CIPHERTEXT.subarray(10)];
        const decrypted = chunks.map((chunk) => decipher.update(chunk));
        decipher.final();

        expect(Buffer.concat(decrypted)).toEqual(PLAINTEXT);
    });
});
