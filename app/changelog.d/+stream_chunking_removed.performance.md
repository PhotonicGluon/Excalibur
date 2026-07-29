⚡️ Slightly improved performance of encryption/decryption operations by removing stream chunking.

- We no longer pre-chunk streams before passing them to the encryption/decryption functions as ExEF v4 handles chunking internally.
