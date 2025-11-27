/**
 * Node in a Trie data structure
 */
class TrieNode {
    /** Children of the node */
    public children: { [key: string]: TrieNode } = {};
    /** Whether the node is the end of a word */
    public isWordEnd: boolean = false;
}

/**
 * Trie data structure
 */
class Trie {
    /** Root of the trie */
    private root: TrieNode;

    constructor() {
        this.root = new TrieNode();
    }

    /**
     * Inserts a word into the trie
     *
     * @param word Word to insert
     */
    public insert(word: string) {
        let currentNode = this.root;
        for (const char of word) {
            if (!currentNode.children[char]) {
                currentNode.children[char] = new TrieNode();
            }
            currentNode = currentNode.children[char];
        }
        currentNode.isWordEnd = true;
    }

    /**
     * Checks if the trie contains a word
     *
     * @param word Word to check
     * @returns Whether the trie contains the word
     */
    public has(word: string): boolean {
        const matches = this.findWords(word);
        return matches.length !== 0 && matches[0] === word;
    }

    /**
     * Finds all words in the trie that start with the given prefix
     *
     * @param prefix Prefix to search for
     * @returns Array of words that start with the prefix
     */
    public findWords(prefix: string): string[] {
        let currentNode = this.root;
        for (const char of prefix) {
            if (!currentNode.children[char]) {
                return [];
            }
            currentNode = currentNode.children[char];
        }
        return this.collectWords(currentNode, prefix);
    }

    /**
     * Recursively collects all words in the trie that start with the given prefix
     *
     * @param node Node to collect words from
     * @param prefix Prefix to search for
     * @returns Array of words that start with the prefix
     */
    private collectWords(node: TrieNode, prefix: string): string[] {
        const words: string[] = [];
        if (node.isWordEnd) {
            words.push(prefix);
        }
        for (const char in node.children) {
            words.push(...this.collectWords(node.children[char], prefix + char));
        }
        return words;
    }
}

export default Trie;
