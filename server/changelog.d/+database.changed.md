🗃️ Modified the Excalibur database:

- Modified the `FSItem` table:
  - Added `ciphertext_hash`, `content_mac`, `node_hash`, and `version` fields
- Created `Attestation` and `VaultState` tables
  - These are used for Merkle tree verification of vault data
