from excalibur_server.api.v1.security.srp import router
from excalibur_server.src.security.srp import SRP_GROUP_SIZES_TYPE
from excalibur_server.src.security.consts import SRP_GROUP


@router.get("/group-size", summary="Establish SRP Group Size", response_model=SRP_GROUP_SIZES_TYPE)
def establish_srp_group_endpoint():
    """
    Endpoint that helps establish the SRP (Secure Remote Password) group size.
    """

    return SRP_GROUP.bits
