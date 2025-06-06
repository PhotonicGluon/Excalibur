import { decrypt, encrypt } from "./crypto";

describe("crypto operations", () => {
    it.each([
        [
            128,
            "hello world foo bar",
            "1111111111111111",
            "one demo 16B val",
            "a49Y6bWynsEFTKEy7t/GVdeZbw==",
            "8ZdhE+7NuFQoDmIbhxpKcw==",
        ],
        [
            192,
            "hello world foo bar",
            "111111111111111111111111",
            "one demo 24B val, oh wow",
            "LlxwEapEAxEu6DCRou59v9ZCLg==",
            "+vp2LYHo48VwWTI0o1uOSg==",
        ],
        [
            256,
            "hello world foo bar",
            "11111111111111111111111111111111",
            "one demo 32B val, oh wow, oh my!",
            "DQIweslwGwPt1/RzOGng6kk3mw==",
            "nNUnGV/B05N/uM3rejAf0w==",
        ],
    ])(
        "%i-bit cipher",
        (keylen: number, plaintext: string, key: string, nonce: string, ciphertext: string, tag: string) => {
            const exef = encrypt(
                Buffer.from(plaintext, "utf-8"),
                Buffer.from(key, "utf-8"),
                Buffer.from(nonce, "utf-8"),
            );
            expect(exef.alg).toBe(`aes-${keylen}-gcm`);
            expect(exef.nonce).toEqual(Buffer.from(nonce, "utf-8"));
            expect(exef.ciphertext).toEqual(Buffer.from(ciphertext, "base64"));
            expect(exef.tag).toEqual(Buffer.from(tag, "base64"));

            const decrypted = decrypt(exef, Buffer.from(key, "utf-8"));
            expect(decrypted.toString("utf-8")).toBe(plaintext);
        },
    );
});

test("crypto failures", () => {
    expect(() => {
        decrypt(
            encrypt(Buffer.from("foo", "utf-8"), Buffer.from("bar", "utf-8"), Buffer.from("baz", "utf-8")),
            Buffer.from("BAD", "utf-8"),
        );
    }).toThrow();

    expect(() => {
        let encryptedResponse = encrypt(
            Buffer.from("foo", "utf-8"),
            Buffer.from("bar", "utf-8"),
            Buffer.from("baz", "utf-8"),
        );
        encryptedResponse.nonce = Buffer.from("NOPE", "utf-8");
        decrypt(encryptedResponse, Buffer.from("bar", "utf-8"));
    }).toThrow();

    expect(() => {
        let encryptedResponse = encrypt(
            Buffer.from("foo", "utf-8"),
            Buffer.from("bar", "utf-8"),
            Buffer.from("baz", "utf-8"),
        );
        encryptedResponse.tag = Buffer.from("NOPE", "utf-8");
        decrypt(encryptedResponse, Buffer.from("bar", "utf-8"));
    }).toThrow();
});
