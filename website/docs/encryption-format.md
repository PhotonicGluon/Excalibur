# Encryption Format

All traffic and files will be encrypted using the Excalibur Encryption Format (ExEF). Files with a file extension of `.exef` will use the Excalibur Encryption Format.

The following is a diagram of the ExEF format. The numbers represent 0-indexed _byte_ positions.

[![](https://mermaid.ink/img/pako:eNpNkM1ugzAQhF8F7Rkj_m18TdJLlV5S9VBxcWEDVoONHCOFIN69GFAV3_ztzGh2J6h0jcChF9UvWvKDVpTK80KScK-E0-P05p1FI6sSHE5J5vAXmrvUamM5oY694-hd5BM3yEhUOPqhVbWjOCTxqjzIvkVj8WFfDDEjecJfh3t6Suia9CmaEsCHDk0nZL1Unty8BNtit4Q4TY1XMdxW57xIxWD1ZVQVcGsG9MHooWmBX8XtvvyGvhYWj1I0RnT_tBcK-AQP4GkcFCwOk5jSjFFWhLkPI3CWBGlCs9mHp9aLLwwYzcLlRVFe0DRniQ9YS6vNebvseuA1-Hs1bF0a43bYe6Gq0Rz0oCzwIp3_ANZVeeg?type=png)](https://mermaid.live/edit#pako:eNpNkM1ugzAQhF8F7Rkj_m18TdJLlV5S9VBxcWEDVoONHCOFIN69GFAV3_ztzGh2J6h0jcChF9UvWvKDVpTK80KScK-E0-P05p1FI6sSHE5J5vAXmrvUamM5oY694-hd5BM3yEhUOPqhVbWjOCTxqjzIvkVj8WFfDDEjecJfh3t6Suia9CmaEsCHDk0nZL1Unty8BNtit4Q4TY1XMdxW57xIxWD1ZVQVcGsG9MHooWmBX8XtvvyGvhYWj1I0RnT_tBcK-AQP4GkcFCwOk5jSjFFWhLkPI3CWBGlCs9mHp9aLLwwYzcLlRVFe0DRniQ9YS6vNebvseuA1-Hs1bF0a43bYe6Gq0Rz0oCzwIp3_ANZVeeg)

- Bytes `0` to `3` will be the ExEF magic constant. The magic constant is the ASCII string `ExEF`.
- Bytes `4` and `5` represent the ExEF version, which should be interpreted as an 2-byte unsigned integer. The current version is `00 02`.
- Bytes `6` and `7` represent the AES-GCM key size, which should be interpreted as an 2-byte unsigned integer. There are currently only 3 supported values.
  - The bytes `00 80` represent `aes-128-gcm`.
  - The bytes `00 C0` represent `aes-192-gcm`.
  - The bytes `01 00` represent `aes-256-gcm`.
- Bytes `8` to `19` represent the 12-byte nonce used for AES-GCM encryption.
- Bytes `20` to `27` represent the ciphertext length, which should be interpreted as an 8-byte unsigned integer.
- The ciphertext follows.
- The last 16 bytes is the 16-byte AES-GCM tag.

Regex that matches hex:

```
(?<magic>45784546)(?<version>[0-9a-f]{4})(?<aes_key_len>0080|00C0|0100)(?<nonce>[0-9a-f]{24})(?<ct_len>[0-9a-f]{16})(?<ct>[0-9a-f]+)(?<tag>[0-9a-f]{32})
```
