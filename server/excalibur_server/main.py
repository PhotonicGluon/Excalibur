import os

import uvicorn

from excalibur_server.consts import FILES_FOLDER


def start_server(host: str, port: int, debug: bool):
    """
    Starts the API server.
    """

    # Make the files folder
    os.makedirs(FILES_FOLDER, exist_ok=True)

    # Start server
    uvicorn.run(
        "excalibur_server.api.app:app",
        host=host,
        port=port,
        reload=debug,
        reload_dirs=[os.path.dirname(__file__)],
        reload_excludes=["examples/*"],
    )
