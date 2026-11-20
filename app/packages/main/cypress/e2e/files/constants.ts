export const TINY_SIZE = 64;
export const SMALL_SIZE = 1024;
export const LARGE_SIZE = 1000000; // Enough for several chunking to occur

// Names (the encrypted form of a name may be at most 2048 bytes)
export const LONG_NAME_LENGTH = 2100; // Over the limit, even for ASCII
export const UNICODE_NAME = "Ünï-日本語-🙂";
export const NFC_E_ACUTE = "é"; // "é" as one code point
export const NFD_E_ACUTE = "é"; // "é" as "e" + combining accent
