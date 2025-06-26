from excalibur_server.src.security.auth.srp import SRPGroup

LOGIN_VALIDITY_TIME = 3600  # 1 hour

SRP_GROUP = SRPGroup.SMALL
SRP_HANDSHAKE_CACHE_SIZE = 128
SRP_HANDSHAKE_TIME = 60  # Amount of time, in seconds, to complete SRP handshake
