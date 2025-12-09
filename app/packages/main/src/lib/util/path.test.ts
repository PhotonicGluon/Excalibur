import { expect } from "vitest";

import { getBaseName, getParent, getParents } from "./path";

describe("getParent", () => {
    const TEST_CASES = [
        // Standard relative paths
        ["src/utils/file.ts", "src/utils"],
        ["src/utils", "src"],
        ["file.ts", ""],
        ["folder/sub", "folder"],

        // Absolute paths
        ["/usr/local/bin", "/usr/local"],
        ["/home/user/file.txt", "/home/user"],

        // Edge cases
        ["/var", ""],
        ["/", ""],
        ["", ""],

        // Trailing slashes
        ["folder/sub/", "folder"],
    ];

    for (const testCase of TEST_CASES) {
        const path = testCase[0];
        const expected = testCase[1];
        it(`should return '${expected}' as parent of '${path}'`, () => {
            expect(getParent(path)).toBe(expected);
        });
    }
});

describe("getParents", () => {
    const TEST_CASES = [
        // Standard relative paths
        ["src/utils/file.ts", ["src/utils", "src", "."]],
        ["src/utils", ["src", "."]],
        ["file.ts", ["."]],
        ["folder/sub", ["folder", "."]],

        // Absolute paths
        ["/usr/local/bin", ["/usr/local", "/usr", "/"]],
        ["/home/user/file.txt", ["/home/user", "/home", "/"]],

        // Edge cases
        ["/var", ["/"]],
        ["/", []],
        ["", []],

        // Trailing slashes
        ["folder/sub/", ["folder", "."]],
    ];

    for (const testCase of TEST_CASES) {
        const path = testCase[0] as string;
        const expected = testCase[1] as string[];
        it(`should return '${expected}' as parents of '${path}'`, () => {
            expect(getParents(path)).toEqual(expected);
        });
    }
});

describe("getBaseName", () => {
    const TEST_CASES = [
        // Standard relative paths
        ["src/utils/file.ts", "file.ts"],
        ["src/utils", "utils"],
        ["file.ts", "file.ts"],
        ["folder/sub", "sub"],

        // Absolute paths
        ["/usr/local/bin", "bin"],
        ["/home/user/file.txt", "file.txt"],
        ["/var", "var"],

        // Edge cases
        ["", ""],
        ["/", ""],

        // Trailing slashes
        ["folder/sub/", ""],
    ];

    for (const testCase of TEST_CASES) {
        const path = testCase[0];
        const expected = testCase[1];
        it(`should return '${expected}' as base name of '${path}'`, () => {
            expect(getBaseName(path)).toBe(expected);
        });
    }
});
