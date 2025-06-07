import { decrypt, encrypt } from "./crypto";

describe("crypto operations", () => {
    it.each([
        [
            128,
            "hello world foo bar",
            "1111111111111111",
            "one demo 16B val",
            "b25lIGRlbW8gMTZCIHZhbA==",
            "a49Y6bWynsEFTKEy7t/GVdeZbw==",
            "8ZdhE+7NuFQoDmIbhxpKcw==",
        ],
        [
            192,
            "hello world foo bar",
            "111111111111111111111111",
            "one demo 24B val, oh wow",
            "b25lIGRlbW8gMjRCIHZhbCwgb2ggd293",
            "LlxwEapEAxEu6DCRou59v9ZCLg==",
            "+vp2LYHo48VwWTI0o1uOSg==",
        ],
        [
            256,
            "hello world foo bar",
            "11111111111111111111111111111111",
            "one demo 32B val, oh wow, oh my!",
            "b25lIGRlbW8gMzJCIHZhbCwgb2ggd293LCBvaCBteSE=",
            "DQIweslwGwPt1/RzOGng6kk3mw==",
            "nNUnGV/B05N/uM3rejAf0w==",
        ],
    ])(
        "%i-bit cipher",
        (
            keylen: number,
            plaintext: string,
            key: string,
            nonce: string,
            nonce_: string,
            ciphertext: string,
            tag: string,
        ) => {
            const encryptedResponse = encrypt(
                Buffer.from(plaintext, "utf-8"),
                Buffer.from(key, "utf-8"),
                Buffer.from(nonce, "utf-8"),
            );
            expect(encryptedResponse.alg).toBe(`aes-${keylen}-gcm`);
            expect(encryptedResponse.nonce).toBe(nonce_);
            expect(encryptedResponse.ciphertext).toBe(ciphertext);
            expect(encryptedResponse.tag).toBe(tag);

            const decrypted = decrypt(encryptedResponse, Buffer.from(key, "utf-8"));
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
        encryptedResponse.nonce = "NOPE";
        decrypt(encryptedResponse, Buffer.from("bar", "utf-8"));
    }).toThrow();

    expect(() => {
        let encryptedResponse = encrypt(
            Buffer.from("foo", "utf-8"),
            Buffer.from("bar", "utf-8"),
            Buffer.from("baz", "utf-8"),
        );
        encryptedResponse.tag = "NOPE";
        decrypt(encryptedResponse, Buffer.from("bar", "utf-8"));
    }).toThrow();
});
