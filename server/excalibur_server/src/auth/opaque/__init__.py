from excalibur_server.src.auth.opaque import structures
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer

SERVER_IDENTITY = b"Excalibur-Server"
OPAQUE_OPRF_TYPE = "ristretto255-sha512"
OPAQUE = OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE)

__all__ = ["OPAQUE", "OPAQUE_OPRF_TYPE", "structures", "SERVER_IDENTITY"]
