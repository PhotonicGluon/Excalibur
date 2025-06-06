import { ExEF } from "./exef";

const SAMPLE_EXEF = Buffer.from(
    "45784546000100c0abababababababababababababababababababababababab0000000000000000cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd000000000000000548454c4c4f",
    "hex",
);

test("ExEF parsing", () => {
    const exef = ExEF.fromBuffer(SAMPLE_EXEF);
    expect(exef.version).toBe(1);
    expect(exef.keysize).toBe(192);
    expect(exef.nonce.toString("hex")).toBe("abababababababababababababababababababababababab0000000000000000");
    expect(exef.tag.toString("hex")).toBe("cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd");
    expect(exef.ciphertext.toString("hex")).toBe("48454c4c4f");

    const buffer = exef.toBuffer();
    expect(buffer.toString("hex")).toBe(SAMPLE_EXEF.toString("hex"));
});

test("Invalid ExEF", () => {
    // TODO: Add more to this test

    expect(() => ExEF.fromBuffer(Buffer.from("NOPE", "hex"))).toThrow();
});
