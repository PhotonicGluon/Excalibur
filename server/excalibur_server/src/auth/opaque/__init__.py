from excalibur_server.src.auth.opaque import structures
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer

SERVER_IDENTITY = b"Excalibur-Server"
OPAQUE_OPRF_TYPE = "ristretto255-sha512"

__all__ = ["OPAQUE_OPRF_TYPE", "SERVER_IDENTITY", "OPAQUEServer", "structures"]
