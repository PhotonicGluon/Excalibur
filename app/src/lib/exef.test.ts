import { ExEF } from "./exef";

const SAMPLE_EXEF = Buffer.from(
    "45784546000200c0abababababababababababab000000000000000548454c4c4fcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
    "hex",
);

test("ExEF parsing", () => {
    const exef = ExEF.fromBuffer(SAMPLE_EXEF);
    expect(exef.keysize).toBe(192);
    expect(exef.alg).toBe("aes-192-gcm");
    expect(exef.nonce.toString("hex")).toBe("abababababababababababab");
    expect(exef.ciphertext.toString("hex")).toBe("48454c4c4f");
    expect(exef.tag.toString("hex")).toBe("cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd");

    const buffer = exef.toBuffer();
    expect(buffer.toString("hex")).toBe(SAMPLE_EXEF.toString("hex"));
});

test("Invalid ExEF", () => {
    // TODO: Add more to this test

    expect(() => ExEF.fromBuffer(Buffer.from("NOPE", "hex"))).toThrow();
});
