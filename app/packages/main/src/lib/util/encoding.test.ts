import { expect } from "vitest";

import { b64decode, b64decodeURLSafe, b64encode, b64encodeURLSafe, bytesToUUID, uuidToBytes } from "./encoding";

describe("b64encode", () => {
    it("should work with string", () => {
        expect(b64encode("test")).toEqual("dGVzdA==");
    });

    it("should work if padding is specified", () => {
        expect(b64encode("test", true)).toEqual("dGVzdA==");
        expect(b64encode("test", false)).toEqual("dGVzdA");
    });

    it("should work with buffer", () => {
        expect(b64encode(Buffer.from("ff ef df cf bf af 9f 8f".replaceAll(" ", ""), "hex"))).toEqual("/+/fz7+vn48=");
    });

    it("should work with UTF-8", () => {
        expect(b64encode("Hello, 世界!")).toEqual("SGVsbG8sIOS4lueVjCE=");
    });
});

describe("b64decode", () => {
    it("should work with string", () => {
        expect(b64decode("dGVzdA==")).toEqual(Buffer.from("test", "utf-8"));
    });

    it("should work with buffer", () => {
        expect(b64decode("/+/fz7+vn48=")).toEqual(Buffer.from("ff ef df cf bf af 9f 8f".replaceAll(" ", ""), "hex"));
    });

    it("should work with UTF-8", () => {
        expect(b64decode("SGVsbG8sIOS4lueVjCE=")).toEqual(Buffer.from("Hello, 世界!", "utf-8"));
    });
});

describe("b64encodeURLSafe", () => {
    it("should work with string", () => {
        expect(b64encodeURLSafe("test")).toEqual("dGVzdA==");
    });

    it("should work with buffer", () => {
        expect(b64encodeURLSafe(Buffer.from("ff ef df cf bf af 9f 8f".replaceAll(" ", ""), "hex"))).toEqual(
            "_-_fz7-vn48=",
        );
    });

    it("should work with UTF-8", () => {
        expect(b64encodeURLSafe("Hello, 世界!")).toEqual("SGVsbG8sIOS4lueVjCE=");
    });
});

describe("b64decodeURLSafe", () => {
    it("should work with string", () => {
        expect(b64decodeURLSafe("dGVzdA")).toEqual(Buffer.from("test", "utf-8"));
    });

    it("should work with buffer", () => {
        expect(b64decodeURLSafe("_-_fz7-vn48")).toEqual(
            Buffer.from("ff ef df cf bf af 9f 8f".replaceAll(" ", ""), "hex"),
        );
    });

    it("should work with UTF-8", () => {
        expect(b64decodeURLSafe("SGVsbG8sIOS4lueVjCE")).toEqual(Buffer.from("Hello, 世界!", "utf-8"));
    });
});

describe("uuidToBytes", () => {
    it("should work with UUID with hyphens", () => {
        expect(uuidToBytes("550e8400-e29b-41d4-a716-446655440000")).toEqual(
            Buffer.from("550e8400e29b41d4a716446655440000", "hex"),
        );
    });

    it("should work with UUID without hyphens", () => {
        expect(uuidToBytes("550e8400e29b41d4a716446655440000")).toEqual(
            Buffer.from("550e8400e29b41d4a716446655440000", "hex"),
        );
    });
});

describe("bytesToUUID", () => {
    it("should work with UUID with hyphens", () => {
        expect(bytesToUUID(Buffer.from("550e8400e29b41d4a716446655440000", "hex"))).toEqual(
            "550e8400-e29b-41d4-a716-446655440000",
        );
    });

    it("should work with UUID without hyphens", () => {
        expect(bytesToUUID(Buffer.from("550e8400e29b41d4a716446655440000", "hex"))).toEqual(
            "550e8400-e29b-41d4-a716-446655440000",
        );
    });
});
