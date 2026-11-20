import { expect, it } from "vitest";

import { computeNameTag, decryptName } from "@lib/files/names";
import { NameKeys } from "@lib/files/names/keys";
import { SubstitutionCipher } from "@lib/files/names/obfuscation";

import { PendingName } from "@api/files";

import { AuthProvider } from "@components/auth/context";

import { migrateNamesToEncrypted } from "./migrate";

const { hasPendingNames, getPendingNames, fillNames, editVaultInfo } = vi.hoisted(() => ({
    hasPendingNames: vi.fn(),
    getPendingNames: vi.fn(),
    fillNames: vi.fn(),
    editVaultInfo: vi.fn(),
}));

vi.mock("@api/files", () => ({ hasPendingNames, getPendingNames, fillNames }));
vi.mock("@api/users", () => ({ editVaultInfo }));

const KEYS = new NameKeys(Buffer.from("1".repeat(24), "utf-8"), Buffer.from("0".repeat(32), "hex"));
const PARENT_ID = "00000000-0000-0000-0000-0000000000a1";
const NOC = new SubstitutionCipher(Buffer.from("test"));

function makeID(i: number): string {
    return `00000000-0000-0000-0000-${i.toString(16).padStart(12, "0")}`;
}

function makePending(i: number, name: string, isFolder: boolean = false): PendingName {
    return { id: makeID(i), parentID: PARENT_ID, isFolder, name };
}

function makeAuth(obfuscatedNames: boolean = false): AuthProvider & { setVaultInfo: ReturnType<typeof vi.fn> } {
    return {
        authInfo: { key: Buffer.alloc(0) },
        serverInfo: { apiURL: "http://localhost" },
        vaultInfo: {
            nameKeys: KEYS,
            keygenAlgorithm: 0,
            info: { obfuscatedNames },
        },
        noc: obfuscatedNames ? NOC : null,
        getToken: () => "token",
        setVaultInfo: vi.fn(),
    } as unknown as AuthProvider & { setVaultInfo: ReturnType<typeof vi.fn> };
}

/**
 * Makes the mocked server hold the given pending items. `fillNames` removes the filled items from
 * the pending list, like the real server does.
 */
function useServerWith(initial: PendingName[]) {
    let pending = [...initial];
    const filled: Record<string, { name_enc: string; name_tag: string }> = {};

    getPendingNames.mockImplementation(async (_auth: unknown, limit?: number, offset: number = 0) => ({
        success: true,
        items: pending.slice(offset, limit === undefined ? undefined : offset + limit),
    }));
    hasPendingNames.mockImplementation(async () => ({ success: true, pending: pending.length > 0 }));
    fillNames.mockImplementation(async (_auth: unknown, names: Record<string, never>) => {
        Object.assign(filled, names);
        pending = pending.filter((item) => !(item.id in names));
        return { success: true };
    });
    return { filled, addPending: (items: PendingName[]) => (pending = [...pending, ...items]) };
}

beforeEach(() => {
    vi.resetAllMocks();
    editVaultInfo.mockResolvedValue({ success: true });
});

describe("migrateNamesToEncrypted", () => {
    it("should replace plaintext names with encrypted ones", async () => {
        const server = useServerWith([makePending(1, "docs", true), makePending(2, "日本語 🎉.txt.exef")]);

        const result = await migrateNamesToEncrypted(makeAuth());
        expect(result).toEqual({ success: true });

        // Names should decrypt to the original names, and be bound to the item and parent
        expect(Object.keys(server.filled)).toHaveLength(2);
        const folder = server.filled[makeID(1)];
        expect(await decryptName(KEYS, makeID(1), Buffer.from(folder.name_enc, "base64"))).toBe("docs");
        expect(folder.name_tag).toBe(computeNameTag(KEYS, PARENT_ID, "docs").toString("base64"));

        // Files lose their `.exef` suffix
        const file = server.filled[makeID(2)];
        expect(await decryptName(KEYS, makeID(2), Buffer.from(file.name_enc, "base64"))).toBe("日本語 🎉.txt");
        expect(file.name_tag).toBe(computeNameTag(KEYS, PARENT_ID, "日本語 🎉.txt").toString("base64"));
    });

    it("should keep the `.exef` ending of a folder name", async () => {
        const server = useServerWith([makePending(1, "odd.exef", true)]);

        await migrateNamesToEncrypted(makeAuth());
        const entry = server.filled[makeID(1)];
        expect(await decryptName(KEYS, makeID(1), Buffer.from(entry.name_enc, "base64"))).toBe("odd.exef");
    });

    it("should undo obfuscation and then turn it off", async () => {
        const server = useServerWith([
            makePending(1, NOC.encipher(Buffer.from("secret-folder")), true),
            makePending(2, NOC.encipher(Buffer.from("secret-file.txt")) + ".exef"),
        ]);
        const auth = makeAuth(true);

        const result = await migrateNamesToEncrypted(auth);
        expect(result).toEqual({ success: true });

        const names = await Promise.all(
            [1, 2].map(async (i) =>
                decryptName(KEYS, makeID(i), Buffer.from(server.filled[makeID(i)].name_enc, "base64")),
            ),
        );
        expect(names).toEqual(["secret-folder", "secret-file.txt"]);

        expect(editVaultInfo).toHaveBeenCalledTimes(1);
        expect(editVaultInfo.mock.calls[0][4]).toEqual({ obfuscatedNames: false });
        expect(auth.setVaultInfo).toHaveBeenCalledWith(expect.objectContaining({ info: { obfuscatedNames: false } }));
    });

    it("should not touch the vault info if names were not obfuscated", async () => {
        useServerWith([makePending(1, "plain", true)]);

        await migrateNamesToEncrypted(makeAuth(false));
        expect(editVaultInfo).not.toHaveBeenCalled();
    });

    it("should report an error if turning off obfuscation fails", async () => {
        useServerWith([makePending(1, NOC.encipher(Buffer.from("x")), true)]);
        editVaultInfo.mockResolvedValue({ success: false, error: "nope" });

        const result = await migrateNamesToEncrypted(makeAuth(true));
        expect(result.success).toBe(false);
        expect(result.error).toContain("nope");
    });

    it.each([
        ["with a slash", "a/b"],
        ["empty", ""],
        ["a single dot", "."],
    ])("should refuse a legacy name that is %s", async (_label, name) => {
        useServerWith([makePending(1, name, true)]);

        const result = await migrateNamesToEncrypted(makeAuth());
        expect(result.success).toBe(false);
        expect(result.error).toContain(`Cannot encrypt the name of item '${makeID(1)}'`);
        expect(fillNames).not.toHaveBeenCalled();
    });

    it("should fetch pending names in pages", async () => {
        const items = Array.from({ length: 1100 }, (_, i) => makePending(i + 1, `folder-${i}`, true));
        const server = useServerWith(items);

        const result = await migrateNamesToEncrypted(makeAuth());
        expect(result).toEqual({ success: true });
        expect(Object.keys(server.filled)).toHaveLength(1100);

        const offsets = getPendingNames.mock.calls.map((call) => call[2]);
        expect(offsets.slice(0, 3)).toEqual([0, 500, 1000]);
    });

    it("should fill names in chunks and report progress", async () => {
        const items = Array.from({ length: 450 }, (_, i) => makePending(i + 1, `folder-${i}`, true));
        useServerWith(items);
        const onProgress = vi.fn();

        await migrateNamesToEncrypted(makeAuth(), onProgress);

        expect(fillNames.mock.calls.map((call) => Object.keys(call[1]).length)).toEqual([200, 200, 50]);
        expect(onProgress.mock.calls.map((call) => call[0])).toEqual([
            { migratedCount: 0, totalCount: 450 },
            { migratedCount: 200, totalCount: 450 },
            { migratedCount: 400, totalCount: 450 },
            { migratedCount: 450, totalCount: 450 },
        ]);
    });

    it("should only handle the remaining names when resumed", async () => {
        const items = Array.from({ length: 300 }, (_, i) => makePending(i + 1, `folder-${i}`, true));
        const server = useServerWith(items);

        // Fail on the second chunk
        const fill = fillNames.getMockImplementation()!;
        fillNames.mockImplementationOnce(fill).mockResolvedValueOnce({ success: false, error: "interrupted" });

        const failed = await migrateNamesToEncrypted(makeAuth());
        expect(failed).toEqual({ success: false, error: "interrupted" });
        expect(Object.keys(server.filled)).toHaveLength(200);

        // Try again
        getPendingNames.mockClear();
        fillNames.mockClear();
        const resumed = await migrateNamesToEncrypted(makeAuth());
        expect(resumed).toEqual({ success: true });
        expect(Object.keys(server.filled)).toHaveLength(300);
        expect(fillNames.mock.calls.map((call) => Object.keys(call[1]).length)).toEqual([100]);
    });

    it("should pick up names that were added during the migration", async () => {
        const server = useServerWith([makePending(1, "first", true)]);

        // A new name shows up while the first one is being filled
        const fill = fillNames.getMockImplementation()!;
        fillNames.mockImplementationOnce(async (auth: unknown, names: Record<string, never>) => {
            server.addPending([makePending(2, "late", true)]);
            return fill(auth, names);
        });

        const result = await migrateNamesToEncrypted(makeAuth());
        expect(result).toEqual({ success: true });
        expect(Object.keys(server.filled).sort()).toEqual([makeID(1), makeID(2)]);
    });

    it("should give up if names keep being added", async () => {
        useServerWith([makePending(1, "first", true)]);
        hasPendingNames.mockResolvedValue({ success: true, pending: true });

        const result = await migrateNamesToEncrypted(makeAuth(), undefined, 2);
        expect(result.success).toBe(false);
        expect(result.error).toContain("Names are being added faster than they can be encrypted");
        expect(getPendingNames).toHaveBeenCalledTimes(3); // The first try and two retries
    });

    it("should pass on errors from listing the pending names", async () => {
        getPendingNames.mockResolvedValue({ success: false, error: "Unauthorized" });

        expect(await migrateNamesToEncrypted(makeAuth())).toEqual({ success: false, error: "Unauthorized" });
        expect(fillNames).not.toHaveBeenCalled();
    });

    it("should pass on errors from checking for pending names", async () => {
        useServerWith([makePending(1, "first", true)]);
        hasPendingNames.mockResolvedValue({ success: false, error: "Unknown error" });

        expect(await migrateNamesToEncrypted(makeAuth())).toEqual({ success: false, error: "Unknown error" });
    });
});
