import { expect } from "vitest";

import Trie from "./trie";

describe("Trie", () => {
    let trie: Trie;
    const sampleWords = ["apple", "apply", "apricot", "api", "banana", "bandana", "band"];

    beforeEach(() => {
        trie = new Trie();
    });

    it("should insert a single word and be able to find it", () => {
        trie.insert("hello");
        const words = trie.findWords("he");
        expect(words).toEqual(["hello"]);
    });

    describe("find words", () => {
        beforeEach(() => {
            for (const word of sampleWords) {
                trie.insert(word);
            }
        });

        it("should find all words with a common prefix", () => {
            const results = trie.findWords("ap");
            expect(results).toEqual(expect.arrayContaining(["apple", "apply", "apricot", "api"]));
            expect(results).toHaveLength(4);
        });

        it("should find all words when a shorter prefix is a complete word", () => {
            const results = trie.findWords("band");
            expect(results).toEqual(expect.arrayContaining(["band", "bandana"]));
            expect(results).toHaveLength(2);
        });

        it("should return an empty array if the prefix matches no words", () => {
            const results = trie.findWords("fake");
            expect(results).toEqual([]);
        });

        it("should return the exact word if the prefix is the word itself", () => {
            const results = trie.findWords("apple");
            expect(results).toEqual(["apple"]);
        });

        it("should return true if the word is in the trie", () => {
            expect(trie.has("apple")).toBe(true);
        });

        it("should return false if the word is not in the trie", () => {
            expect(trie.has("fake")).toBe(false);
        });

        it("should return false if only a partial match", () => {
            expect(trie.has("app")).toBe(false);
        });
    });

    describe("Edge Cases", () => {
        it("should return all words if an empty string is used as a prefix", () => {
            trie.insert("one");
            trie.insert("two");
            const results = trie.findWords("");
            expect(results).toEqual(expect.arrayContaining(["one", "two"]));
            expect(results).toHaveLength(2);
        });

        it("should handle words with numbers and special characters", () => {
            trie.insert("version-1");
            trie.insert("version-2");
            const results = trie.findWords("version-");
            expect(results).toEqual(expect.arrayContaining(["version-1", "version-2"]));
        });
    });
});
