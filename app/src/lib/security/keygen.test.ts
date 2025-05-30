import { fastHash, generateKey, slowHash } from "./keygen";

test("slowHash", () => {
    const password = "password";
    const salt = Buffer.from("deadbeef", "hex");
    const result = slowHash(password, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("9d6c8033fbdbdfa2fe3ffc4323c239b7aea51f59ae48923560886044983e9af9", "hex"));
});

test("fastHash", async () => {
    const secretString = "MY-SECRET-KEY!!!";
    const salt = Buffer.from("deadbeef", "hex");
    const result = await fastHash(secretString, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("0219361af394f8b7c93b953cd88f22f729b8ff0386f21263b4ae896248ee7a17", "hex"));
});

test("generateKey", async () => {
    const password = "password";
    const secretString = "MY-SECRET-KEY!!!";
    const salt = Buffer.from("deadbeef", "hex");
    const result = await generateKey(password, secretString, salt);

    expect(result.length).toBe(32);
    expect(result).toEqual(Buffer.from("9f75b629084f27153704697ffb4d1b40871de05a28ba8056d426e926d0d0e0ee", "hex"));
});
