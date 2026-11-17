import { expect } from "vitest";

import { IndexedItem, VaultIndex } from "./vault-index";

const ROOT = "root";

function item(id: string, parent_id: string | null, name: string, type: "file" | "directory"): IndexedItem {
    return { id, parent_id, name, type, creation_time: 0, size: type === "file" ? 1 : undefined };
}

function makeIndex() {
    return new VaultIndex(ROOT, [
        item(ROOT, null, "", "directory"),
        item("docs", ROOT, "docs", "directory"),
        item("work", "docs", "work", "directory"),
        item("report", "work", "report.txt", "file"),
        item("readme", ROOT, "readme.md", "file"),
    ]);
}

describe("VaultIndex", () => {
    it("should resolve paths to IDs", () => {
        const index = makeIndex();
        expect(index.resolve(".")).toBe(ROOT);
        expect(index.resolve("docs")).toBe("docs");
        expect(index.resolve("docs/work/report.txt")).toBe("report");
        expect(index.resolve("docs/missing")).toBeNull();
    });

    it("should find the path of an item", () => {
        const index = makeIndex();
        expect(index.pathOf(ROOT)).toBe(".");
        expect(index.pathOf("work")).toBe("docs/work");
        expect(index.pathOf("report")).toBe("docs/work/report.txt");
        expect(index.pathOf("unknown")).toBeNull();
    });

    it("should have no path for an item whose ancestor is missing", () => {
        const index = makeIndex();
        index.remove("docs");
        expect(index.pathOf("report")).toBeNull();
    });

    it("should list the children of a folder", () => {
        const index = makeIndex();
        expect(index.childrenOf(ROOT).map((child) => child.id)).toEqual(["docs", "readme"]);
        expect(index.childrenOf("report")).toEqual([]);
    });

    it("should follow a rename", () => {
        const index = makeIndex();
        index.set(item("docs", ROOT, "papers", "directory"));
        expect(index.resolve("docs")).toBeNull();
        expect(index.resolve("papers/work/report.txt")).toBe("report");
    });

    it("should follow a move", () => {
        const index = makeIndex();
        index.set(item("report", ROOT, "report.txt", "file"));
        expect(index.pathOf("report")).toBe("report.txt");
        expect(index.childrenOf("work")).toEqual([]);
    });

    it("should replace the children of a folder with a fresh listing", () => {
        const index = makeIndex();
        index.replaceChildren(ROOT, [item("docs", ROOT, "docs", "directory"), item("new", ROOT, "new.txt", "file")]);
        expect(index.resolve("readme.md")).toBeNull();
        expect(index.resolve("new.txt")).toBe("new");
        expect(index.resolve("docs/work")).toBe("work");
    });

    describe("searching", () => {
        const searchIndex = new VaultIndex("root", [
            { id: "root", parent_id: null, name: "", type: "directory", creation_time: 0 },
            { id: "dir", parent_id: "root", name: "dir", type: "directory", creation_time: 0 },
            { id: "a", parent_id: "root", name: "a.txt", type: "file", creation_time: 0, size: 1 },
            { id: "b", parent_id: "dir", name: "b.txt", type: "file", creation_time: 0, size: 2 },
            { id: "c", parent_id: "dir", name: "c.txt", type: "file", creation_time: 0, size: 3 },
        ]);

        it("should only return files", () => {
            const results = searchIndex.search("txt", 10, 0.6);
            expect(results.every((result) => result.file.type === "file")).toBe(true);
            expect(results).toHaveLength(3);
        });

        it("should return at most `limit` results", () => {
            expect(searchIndex.search("txt", 2, 0.6)).toHaveLength(2);
        });

        it("should give files their paths", () => {
            const paths = searchIndex.search("txt", 10, 0.6).map((result) => result.file.fullpath);
            expect(paths).toContain("dir/b.txt");
        });
    });

    it("should convert items for the UI", () => {
        const index = makeIndex();
        expect(VaultIndex.toFileLike(index.get("report")!, "docs/work/report.txt")).toMatchObject({
            type: "file",
            name: "report.txt",
            fullpath: "docs/work/report.txt",
            parent_id: "work",
            size: 1,
        });
        expect(VaultIndex.toFileLike(index.get("docs")!, "docs")).toMatchObject({ type: "directory", items: null });
    });
});
