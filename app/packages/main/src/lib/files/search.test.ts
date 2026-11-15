import { expect } from "vitest";

import { searchIndex } from "./search";
import { VaultIndex } from "./vault-index";

describe("searchIndex", () => {
    const index = new VaultIndex("root", [
        { id: "root", parent_id: null, name: "", type: "directory", creation_time: 0 },
        { id: "dir", parent_id: "root", name: "dir", type: "directory", creation_time: 0 },
        { id: "a", parent_id: "root", name: "a.txt", type: "file", creation_time: 0, size: 1 },
        { id: "b", parent_id: "dir", name: "b.txt", type: "file", creation_time: 0, size: 2 },
        { id: "c", parent_id: "dir", name: "c.txt", type: "file", creation_time: 0, size: 3 },
    ]);

    it("should only return files", () => {
        const results = searchIndex(index, "txt", 10, 0.6);
        expect(results.every((result) => result.file.type === "file")).toBe(true);
        expect(results).toHaveLength(3);
    });

    it("should return at most `limit` results", () => {
        expect(searchIndex(index, "txt", 2, 0.6)).toHaveLength(2);
    });

    it("should give files their paths", () => {
        const paths = searchIndex(index, "txt", 10, 0.6).map((result) => result.file.fullpath);
        expect(paths).toContain("dir/b.txt");
    });
});
