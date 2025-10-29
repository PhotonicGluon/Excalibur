import { readFileSync } from "fs";
import path from "path";

const WORDLIST = readFileSync(path.join(__dirname, "bip39-english.txt"), "utf-8").split("\n");
const WORD_MAP: { [word: string]: number } = {};
WORDLIST.forEach((word, index) => {
    WORD_MAP[word] = index;
});

export { WORD_MAP, WORDLIST };
