from enum import Enum


class AuthProtocol(Enum):
    SRP = 0
    """
    Secure Remote Password (SRP) protocol.

    Will be deprecated in favour of OPAQUE protocol.
    """
    OPAQUE_3DH = 1
    "OPAQUE protocol with 3 Diffie-Hellman (3DH) key exchange."
