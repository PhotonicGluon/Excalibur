🗃️ Modified the Excalibur database:

- Modified the `FSItem` table:
  - Added `ciphertext_hash`, `content_mac`, `node_hash`, and `version` fields for Merkle tree verification
  - Added `name_enc` and `name_tag` fields for encrypted file names, and made the `name` field optional
- Created `Attestation` and `VaultState` tables for Merkle tree verification of vault data
