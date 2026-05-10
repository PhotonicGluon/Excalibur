from enum import Enum


class AuthProtocol(Enum):
    OPAQUE_3DH = "OPAQUE-3DH"
    "OPAQUE protocol with 3 Diffie-Hellman (3DH) key exchange."
