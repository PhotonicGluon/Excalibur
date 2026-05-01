import { expect } from "vitest";

import { SubstitutionCipher } from "./obfuscation";

describe("SubstitutionCipher", () => {
    it("should encrypt and decrypt", () => {
        const cipher = new SubstitutionCipher(Buffer.from("test"));
        const pt = Buffer.from("hello");
        const ct = cipher.encipher(pt);
        const pt2 = cipher.decipher(ct);
        expect(pt2).toEqual(pt);
    });

    it("should produce same ciphertext given same key", () => {
        const cipher1 = new SubstitutionCipher(Buffer.from("test"));
        const cipher2 = new SubstitutionCipher(Buffer.from("test"));
        const pt = Buffer.from("hello");
        const ct1 = cipher1.encipher(pt);
        const ct2 = cipher2.encipher(pt);
        expect(ct1).toEqual(ct2);
    });
});
