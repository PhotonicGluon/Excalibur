from enum import Enum


class MerkleStatus(Enum):
    NONE = "none"
    "No merkle tree has been created for this vault"
    MIGRATING = "migrating"
    "Migrating files to the new merkle tree"
    ACTIVE = "active"
    "Merkle tree is active and ready to use"
