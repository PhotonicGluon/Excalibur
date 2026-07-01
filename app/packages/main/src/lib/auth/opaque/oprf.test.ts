import { expect } from "vitest";

import { bytesToBigInt } from "@lib/util";

import { OPRFRistrettoSHA512 } from "./oprf";

const SK_SCALAR = bytesToBigInt(
    Buffer.from("5ebcea5ee37023ccb9fc2d2019f9d7737be85591ae8652ffa9ef0f4d37063b0e", "hex"),
    "little",
);

const TEST_VECTORS = [
    {
        input: "00",
        blind: "64d37aed22a27f5191de1c1d69fadb899d8862b58eb4220029e036ec4c1f6706",
        blinded_element: "609a0ae68c15a3cf6903766461307e5c8bb2f95e7e6550e1ffa2dc99e412803c",
        evaluated_element: "7ec6578ae5120958eb2db1745758ff379e77cb64fe77b0b2d8cc917ea0869c7e",
        output: "527759c3d9366f277d8c6020418d96bb393ba2afb20ff90df23fb7708264e2f3ab9135e3bd69955851de4b1f9fe8a0973396719b7912ba9ee8aa7d0b5e24bcf6",
    },
    {
        input: "5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a",
        blind: "64d37aed22a27f5191de1c1d69fadb899d8862b58eb4220029e036ec4c1f6706",
        blinded_element: "da27ef466870f5f15296299850aa088629945a17d1f5b7f5ff043f76b3c06418",
        evaluated_element: "b4cbf5a4f1eeda5a63ce7b77c7d23f461db3fcab0dd28e4e17cecb5c90d02c25",
        output: "f4a74c9c592497375e796aa837e907b1a045d34306a749db9f34221f7e750cb4f2a6413a6bf6fa5e19ba6348eb673934a722a7ede2e7621306d18951e7cf2c73",
    },
];

describe("OPRFRistretto", () => {
    for (const testVector of TEST_VECTORS) {
        it(`should match test vector for input ${testVector.input}`, () => {
            const [input, blind, blindedElementBytes, evaluatedElementBytes, output] = [
                Buffer.from(testVector.input, "hex"),
                bytesToBigInt(Buffer.from(testVector.blind, "hex"), "little"),
                Buffer.from(testVector.blinded_element, "hex"),
                Buffer.from(testVector.evaluated_element, "hex"),
                Buffer.from(testVector.output, "hex"),
            ];

            // Test `blind()`
            const [outBlind, outBlindedElement] = OPRFRistrettoSHA512.blind(input, blind);
            expect(outBlind).toEqual(blind);
            expect(Buffer.from(outBlindedElement.toBytes())).toEqual(blindedElementBytes);

            // Test `blindEvaluate()`
            const outEvaluatedElement = OPRFRistrettoSHA512.blindEvaluate(SK_SCALAR, outBlindedElement);
            expect(Buffer.from(outEvaluatedElement.toBytes())).toEqual(evaluatedElementBytes);

            // Test `finalize()`
            const ourOutput = OPRFRistrettoSHA512.finalize(input, blind, outEvaluatedElement);
            expect(Buffer.from(ourOutput)).toEqual(output);
        });
    }
});
