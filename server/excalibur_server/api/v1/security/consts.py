from excalibur_server.api.v1.security.auth.srp import SRPGroup

LOGIN_VALIDITY_TIME = 3600 * 3  # 3 hours

SRP_GROUP = SRPGroup.SMALL
SRP_HANDSHAKE_CACHE_SIZE = 128
SRP_HANDSHAKE_TIME = 60  # Amount of time, in seconds, to complete SRP handshake
