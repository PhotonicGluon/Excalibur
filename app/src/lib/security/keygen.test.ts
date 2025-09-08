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
    const additionalInfo = { username: "test-user" };
    const salt = Buffer.from("deadbeef", "hex");
    const result = await fastHash(additionalInfo, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("2a729be3d3e50315c32e87d48c7be45db7059088d7ab1549ffb53cf500778ac6", "hex"));
});

test("generateKey", async () => {
    const password = "password";
    const additionalInfo = { username: "test-user" };
    const salt = Buffer.from("deadbeef", "hex");
    const result = await generateKey(password, additionalInfo, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("b71e1bd0283edcb73d117b97afb9ddea19a08fd179e3877c9f3d5cb19849103f", "hex"));
});
