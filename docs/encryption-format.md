# Encryption Format

All traffic and files will be encrypted using the Excalibur Encryption Format (ExEF). Files with a file extension of `.exef` will use the Excalibur Encryption Format.

The following is a diagram of the ExEF format. The numbers represent 0-indexed *byte* positions.

[![](https://mermaid.ink/img/pako:eNpVkLtugzAUhl8FnamVIOJiwPaapkubLqkyVCwOnIBVsJFjpFyUd68NUdV682f_37ncoNYNAodR1N9oowNaUakgiKOMBxVszpvXYCtaWVfgMYlyj_doTlKrhRVR6dkbXoKdvOICaZQwTz-0qh8odc45_SnahWRFROYyazl2aCye7R8FIRHL-b_Hp70wUhx6DN5RtbZ7rgBCGNAMQjZuiJvPVWA7HJzEmxs8iqm33nh3X8Vk9e6iauDWTBiC0VPbAT-K_uRu09gIiy9StEYMv3QUCvgNzsDTOF0xmjBGipSyuEjzEC7ACV2RrMzjskhZxkie3UO4au0M8Yo67k6SFKwkBc1CwEZabbbL1uflzyW-5sDSVWv8NI8OUTVo1npSFnhC0_sPDluCMw?type=png)](https://mermaid.live/edit#pako:eNpVkLtugzAUhl8FnamVIOJiwPaapkubLqkyVCwOnIBVsJFjpFyUd68NUdV682f_37ncoNYNAodR1N9oowNaUakgiKOMBxVszpvXYCtaWVfgMYlyj_doTlKrhRVR6dkbXoKdvOICaZQwTz-0qh8odc45_SnahWRFROYyazl2aCye7R8FIRHL-b_Hp70wUhx6DN5RtbZ7rgBCGNAMQjZuiJvPVWA7HJzEmxs8iqm33nh3X8Vk9e6iauDWTBiC0VPbAT-K_uRu09gIiy9StEYMv3QUCvgNzsDTOF0xmjBGipSyuEjzEC7ACV2RrMzjskhZxkie3UO4au0M8Yo67k6SFKwkBc1CwEZabbbL1uflzyW-5sDSVWv8NI8OUTVo1npSFnhC0_sPDluCMw)

- Bytes `0` to `3` will be the ExEF magic constant. The magic constant is the ASCII string `ExEF`.
- Bytes `4` and `5` represent the ExEF version, which should be interpreted as an 2-byte unsigned integer. The current version is `00 01`.
- Bytes `6` and `7` represent the AES-GCM key size, which should be interpreted as an 2-byte unsigned integer. There are currently only 3 supported values.
  - The bytes `00 80` represent `aes-128-gcm`.
  - The bytes `00 C0` represent `aes-192-gcm`.
  - The bytes `01 00` represent `aes-256-gcm`.
- Bytes `8` to `19` represent the 12-byte nonce used for AES-GCM encryption.
- Bytes `20` to `35` is the 16-byte AES-GCM tag.
- Bytes `36` to `43` represent the ciphertext length, which should be interpreted as an 8-byte unsigned integer.
- The remainder of the message/file is the ciphertext.
