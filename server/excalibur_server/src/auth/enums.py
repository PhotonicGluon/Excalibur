from enum import Enum


class AuthProtocol(Enum):
    SRP = "SRP"
    """
    Secure Remote Password (SRP) protocol.

    Will be deprecated in favour of OPAQUE protocol.
    """
    OPAQUE_3DH = "OPAQUE-3DH"
    "OPAQUE protocol with 3 Diffie-Hellman (3DH) key exchange."
