import generateKey, { slowHash } from "./keygen";

test("slowHash", async () => {
    const password = "password";
    const salt = Buffer.from("deadbeef", "hex");
    const result = await slowHash(password, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9", "hex"));
});

test("generateKey", async () => {
    const password = "password";
    const salt = Buffer.from("deadbeef", "hex");
    const result = await generateKey(password, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9", "hex"));
});
