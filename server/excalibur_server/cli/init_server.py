from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="init")
def init_server(
    reset: Annotated[bool, typer.Option("--reset", "-r", help="Reset the server.")] = False,
):
    """
    Initializes the API server.
    """

    import os

    from excalibur_server.cli.reset_server import _reset_server
    from excalibur_server.consts import FILES_FOLDER, ROOT_FOLDER

    if reset:
        _reset_server()

    # Make the folders
    os.makedirs(ROOT_FOLDER, exist_ok=True)
    os.makedirs(FILES_FOLDER, exist_ok=True)
