from excalibur_server.api.v1.files.routes import router


@router.get("/")
def files_index():
    return "YAY"
