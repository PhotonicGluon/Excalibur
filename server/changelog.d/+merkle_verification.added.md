✨ Added Merkle tree verification of vault data, improving security and data integrity. ([#203](https://github.com/PhotonicGluon/Excalibur/pull/203))

A whole slew of endpoints have been added to support Merkle tree verification:

- `/api/merkle/dirty`: get the dirty (unverified) items of the current user
  - `/api/merkle/dirty/{item_id}`: check if the given item is dirty (unverified)
- `/api/merkle/attestation`: get the latest attestation for the current user
- `/api/merkle/attestations`: get the attestation chain for the current user
- `/api/merkle/content-mac-inputs`: get the inputs for the content message authentication code (MAC) for the given items
- `/api/merkle/migrate`: begin migration of a vault to Merkle tree verification
  - `/api/merkle/migrate/fill`: submits a chunk of Merkle data for an in-progress migration
  - `/api/merkle/migrate/complete`: completes an in-progress migration
- `/api/merkle/mutate`: applies the provided mutation to the Merkle tree
- `/api/merkle/proof/{item_id}`: gets the inclusion proof for the item
- `/api/merkle/state`: gets the current vault state

For more information about how to use these endpoints, please consult the documentation.
