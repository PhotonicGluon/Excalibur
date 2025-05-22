from excalibur_server.api.v1.files import router

# TODO: Add


@router.get("/test-endpoint")
def test_endpoint():
    return "YAY"
