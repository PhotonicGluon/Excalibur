import { expect } from "vitest";

import generateKey, { fastHash, normalizePassword, slowHash } from "./keygen";

describe("normalizePassword", () => {
    it("removes leading and trailing whitespace", () => {
        const password = "  password  ";
        const result = normalizePassword(password);
        const expected = new TextEncoder().encode("password");
        expect(result).toEqual(expected);
    });

    it("normalizes the password to NFKD", () => {
        const password = "ﬃ";
        const result = normalizePassword(password);
        const expected = new TextEncoder().encode("ffi");
        expect(result).toEqual(expected);
    });
});

test("slowHash", async () => {
    const password = "password";
    const salt = Buffer.from("deadbeef", "hex");
    const result = await slowHash(new TextEncoder().encode(password), salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9", "hex"));
});

test("fastHash", async () => {
    const additionalInfo = { username: "test-user", apiURL: "https://example.com" };
    console.log(JSON.stringify(additionalInfo));
    const salt = Buffer.from("deadbeef", "hex");
    const result = await fastHash(additionalInfo, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("769ba5e7434108652a9d3a0952adbe92b6cf96cad0980bbd933e5604c6c02d07", "hex"));
});

test("generateKey", async () => {
    const password = "password";
    const additionalInfo = { username: "test-user", apiURL: "https://example.com" };
    const salt = Buffer.from("deadbeef", "hex");
    const result = await generateKey(password, additionalInfo, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("ebf725d4b89ad7c7d4a2c64a716f8725186a89937ed09988f3b636405efeb7fe", "hex"));
});
