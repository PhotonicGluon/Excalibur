from excalibur_server.api.v1.security.auth.srp import SRP_GROUP_SIZES_TYPE
from excalibur_server.api.v1.security.consts import SRP_GROUP
from excalibur_server.api.v1.security.routes.srp import router


@router.get("/group-size", summary="Establish SRP Group Size", response_model=SRP_GROUP_SIZES_TYPE)
def establish_srp_group_endpoint():
    """
    Endpoint that helps establish the SRP (Secure Remote Password) group size.
    """

    return SRP_GROUP.bits
