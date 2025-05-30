import { fastHash, generateKey, slowHash } from "./keygen";

test("slowHash", async () => {
    const password = "password";
    const salt = Buffer.from("deadbeef", "hex");
    const result = await slowHash(password, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9", "hex"));
});

test("fastHash", async () => {
    const additionalInfo = { serverURL: "https://example.com" };
    const salt = Buffer.from("deadbeef", "hex");
    const result = await fastHash(additionalInfo, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("b392f1d4d76ff4a41d52479c2378f92d338a3b83cb9aabf8cf3ce0168001989e", "hex"));
});

test("generateKey", async () => {
    const password = "password";
    const additionalInfo = { serverURL: "https://example.com" };
    const salt = Buffer.from("deadbeef", "hex");
    const result = await generateKey(password, additionalInfo, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("2efe71e72cb42b06e36dbbdf00bac09a9d2f24da65d239cdafb48052183f0267", "hex"));
});
