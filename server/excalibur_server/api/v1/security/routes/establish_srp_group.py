from excalibur_server.api.v1.security import router
from excalibur_server.api.v1.security.auth.srp import SRP_GROUP, SRP_GROUP_SIZES_TYPE


@router.get("/establish-srp-group", name="Establish SRP Group Size", response_model=SRP_GROUP_SIZES_TYPE)
def establish_srp_group_endpoint():
    """
    Endpoint that helps establish the SRP (Secure Remote Password) group size.
    """

    return SRP_GROUP.bits
