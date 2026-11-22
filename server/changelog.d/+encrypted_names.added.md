✨ Added endpoints to allow the migration of plaintext item names to encrypted names:

- `/api/files/names/pending`: check for (`HEAD`) or list (`GET`) the items that still have a plaintext name
- `/api/files/names/fill`: submit a chunk of encrypted names, which erases the plaintext names of those items and marks them as dirty for the Merkle tree
