from excalibur_server.files import router

# TODO: Add


@router.get("/test-endpoint")
def test_endpoint():
    return "YAY"
