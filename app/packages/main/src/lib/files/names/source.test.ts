import { expect } from "vitest";

import { encryptName } from "./crypto";
import { NameKeys } from "./keys";
import { SubstitutionCipher } from "./obfuscation";
import { getMerkleName, resolveName } from "./source";

const KEY = Buffer.from("1".repeat(24), "utf-8");
const USER_ID = Buffer.from("0".repeat(32), "hex");
const KEYS = new NameKeys(KEY, USER_ID);

const ID_A = "00000000-0000-0000-0000-000000000001";

describe("resolveName", () => {
    it("should decrypt the name of an item that has an encrypted name", async () => {
        const nameEnc = await encryptName(KEYS, ID_A, "hello.txt");
        const name = await resolveName(KEYS, null, {
            id: ID_A,
            type: "file",
            name_enc: nameEnc.toString("base64"),
            name: null,
        });
        expect(name).toBe("hello.txt");
    });

    it("should strip the `.exef` suffix from the legacy name of a file", async () => {
        const name = await resolveName(KEYS, null, { id: ID_A, type: "file", name_enc: null, name: "hello.txt.exef" });
        expect(name).toBe("hello.txt");
    });

    it("should not strip anything from the legacy name of a directory", async () => {
        const name = await resolveName(KEYS, null, { id: ID_A, type: "directory", name_enc: null, name: "a.exef" });
        expect(name).toBe("a.exef");
    });

    it("should decipher an obfuscated legacy name", async () => {
        const noc = new SubstitutionCipher(Buffer.from("key"));
        const obfuscated = noc.encipher(Buffer.from("hello.txt", "utf-8"));
        const file = await resolveName(KEYS, noc, {
            id: ID_A,
            type: "file",
            name_enc: null,
            name: obfuscated + ".exef",
        });
        expect(file).toBe("hello.txt");
    });

    it("should throw if the item has no name", async () => {
        await expect(resolveName(KEYS, null, { id: ID_A, type: "file", name_enc: null, name: null })).rejects.toThrow();
    });
});

describe("getMerkleName", () => {
    it("should use the raw legacy name for an unmigrated item", async () => {
        const name = await getMerkleName(KEYS, { id: ID_A, name_enc: null, name: "hello.txt.exef" });
        expect(name).toBe("hello.txt.exef");
    });

    it("should use the decrypted name for a migrated item", async () => {
        const nameEnc = await encryptName(KEYS, ID_A, "hello.txt");
        const name = await getMerkleName(KEYS, {
            id: ID_A,
            name_enc: nameEnc.toString("base64"),
            name: null,
        });
        expect(name).toBe("hello.txt");
    });
});
