import { expect } from "vitest";

import { blake2b, sha256 } from "./hashing";

describe("sha256", () => {
    it("should give the correct hash", () => {
        expect(sha256(Buffer.alloc(0)).toString("hex")).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        );
        expect(sha256(Buffer.from("abc")).toString("hex")).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
        expect(sha256(Buffer.from("de188941a3375d3a8a061e67576e926d", "hex")).toString("hex")).toBe(
            "067c531269735ca7f541fdaca8f0dc76305d3cada140f89372a410fe5eff6e4d",
        );
    });
});

describe("blake2b", () => {
    it("should give the correct hash", () => {
        expect(blake2b(Buffer.alloc(0)).toString("hex")).toBe(
            "0e5751c026e543b2e8ab2eb06099daa1d1e5df47778f7787faab45cdf12fe3a8",
        );
        expect(blake2b(Buffer.from("abc")).toString("hex")).toBe(
            "bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319",
        );
        expect(blake2b(Buffer.from("de188941a3375d3a8a061e67576e926d", "hex")).toString("hex")).toBe(
            "ad998c6554e8233c3b87edf20053a233f13840a6c84069d00d2553f3c426323e",
        );
    });

    it("should give the correct keyed hash", () => {
        expect(blake2b(Buffer.alloc(0), Buffer.from("key")).toString("hex")).toBe(
            "e65edfce5a36261cd824cb0f0da736b1109dcf20d2b831d598f337bb3552a3e4",
        );
        expect(blake2b(Buffer.from("abc"), Buffer.from("key")).toString("hex")).toBe(
            "0330531d097355a3f72e80d55c1245ccf79f1704431c6e3887938320442c23c0",
        );
        expect(
            blake2b(Buffer.from("de188941a3375d3a8a061e67576e926d", "hex"), Buffer.from("key")).toString("hex"),
        ).toBe("fa60f669ff1ea6b286fd9eba0866452ba6f4a70d5689b18818fe179aee4df74a");
    });
});
