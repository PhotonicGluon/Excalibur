from excalibur_server.security import router


@router.get("/")
def security_index():
    return "Security Index"  # TODO: Change
