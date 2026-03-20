from excalibur_server.src.auth.opaque import structures
from excalibur_server.src.auth.opaque.operation.server import OPAQUEServer

OPAQUE = OPAQUEServer(oprf_type="decaf448-shake256")

__all__ = ["OPAQUE", "structures"]
