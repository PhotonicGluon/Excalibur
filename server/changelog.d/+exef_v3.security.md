Updated the Excalibur File Format (ExEF) to version 3, which includes the following changes.

- Reduced size of the `Version` field from 2 bytes to 1 byte
- Replaced `Key Size` field with `Cipher ID` field for greater flexibility of choice of encryption algorithm, and reduced its size from 2 bytes to 1 byte
- Added `Header MAC` field for quick verification of the decryption key (solving the issue of 'decrypting' the entire file before seeing that the AES-GCM tag does not match)
