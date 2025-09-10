from typing import Literal

from excalibur_server.api.routes.auth import router
from excalibur_server.src.auth.srp import SRPGroup
from excalibur_server.src.config import CONFIG

SRPGroupBits = Literal[*{group.bits for group in SRPGroup}]


@router.get("/group-size")
def get_group_size_endpoint() -> SRPGroupBits:
    """
    Gets the size of the SRP group.

    In particular, this returns the number of bits in the group's modulus.
    """

    return CONFIG.security.srp.group.bits
