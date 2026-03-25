import bip39English from "./bip39-english.json";
import Trie from "./trie";

const WORDS = bip39English as string[];
const WORD_MAP: { [word: string]: number } = {};
const WORD_TRIE = new Trie();
WORDS.forEach((word, index) => {
    WORD_MAP[word] = index;
    WORD_TRIE.insert(word);
});

export { WORD_MAP, WORD_TRIE, WORDS };
