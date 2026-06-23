import { expect } from "vitest";

import generateKey, {
    KeygenAdditionalInfo,
    fastHash,
    normalizePassword,
    slowHashArgon2d,
    slowHashPBKDF2,
} from "./keygen";

const ADDITIONAL_INFO: KeygenAdditionalInfo = { username: "test-user" };
const PASSWORD = "password";
const SALT = Buffer.from("0102030405060708", "hex");

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

test("slowHashPBKDF2", async () => {
    const salt = Buffer.from("0102030405060708", "hex");
    const result = await slowHashPBKDF2(new TextEncoder().encode(PASSWORD), salt);

    expect(result.length).toBe(32);
    expect(result.toString("hex")).toEqual("c17045dfbc41955502e082ef4cac0b718f9486a4e472db31006c0cba7fa1a4a8");
});

test("slowHashArgon2d", async () => {
    const result = await slowHashArgon2d(new TextEncoder().encode(PASSWORD), SALT);

    expect(result.length).toBe(32);
    expect(result.toString("hex")).toEqual("dbd2835b3fd2a51c798d696839a00b06459499a0fc154159f6905257b81df226");
});

test("fastHash", () => {
    const additionalInfo = { username: "test-user" };
    const result = fastHash(additionalInfo, SALT);

    expect(result.length).toBe(32);
    expect(result.toString("hex")).toEqual("0357a5cee4ba51b77d30376f5a6e52c490cfeb67f6a7baf33e4088b7c9f879d9");
});

describe("generateKey", () => {
    it("should work with PBKDF2", async () => {
        const result = await generateKey(PASSWORD, ADDITIONAL_INFO, SALT, "pbkdf2");
        expect(result.length).toBe(32);
        expect(result.toString("hex")).toEqual("c227e01158fbc4e27fd0b58016c259b51f5b6dc312d561c23e2c840db659dd71");
    });

    it("should work with Argon2d", async () => {
        const result = await generateKey(PASSWORD, ADDITIONAL_INFO, SALT, "argon2d");
        expect(result.length).toBe(32);
        expect(result.toString("hex")).toEqual("d8852695db68f4ab04bd5e0763ce59c2d55b72c70ab2fbaac8d0dae071e58bff");
    });
});
