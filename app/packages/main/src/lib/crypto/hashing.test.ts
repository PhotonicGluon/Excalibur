import { expect } from "vitest";
import { sha256 } from "./hashing";

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
