import { expect } from "vitest";

import { ElGamal } from "./elgamal";
import { Ristretto255 } from "./ristretto255";

const PRIV_KEY = 112358n;
const PUB_KEY = Ristretto255.GENERATOR.mul(PRIV_KEY);
const MESSAGE = Ristretto255.GENERATOR.mul(123456789n);
const CIPHERTEXT = Buffer.from(
    "6e96d004e9a414f9649c49d9d8d6f82acd18cf1f6683141a7a885d024092562a36284adc1f40512cf53e2a8988e57feae5ae06b75ca48af6722809d19695d956",
    "hex",
);

describe("ElGamal", () => {
    it("should encrypt correctly", () => {
        const ciphertext = ElGamal.encrypt(PUB_KEY, MESSAGE, 1234n);
        expect(ciphertext.toString("hex")).toEqual(CIPHERTEXT.toString("hex"));
    });

    it("should decrypt correctly", () => {
        const message = ElGamal.decrypt(PRIV_KEY, CIPHERTEXT);
        expect(message.eq(MESSAGE)).toBe(true);
    });
});
