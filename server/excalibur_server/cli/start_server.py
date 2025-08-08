import os
import warnings
from pathlib import Path
from typing import Annotated

import typer
import uvicorn

from excalibur_server.cli import app
from excalibur_server.consts import FILES_FOLDER, ROOT_FOLDER


@app.command(name="start")
def start_server(
    host: Annotated[str, typer.Option(help="Host for the server to listen on.")] = "0.0.0.0",
    port: Annotated[int, typer.Option(help="Port for the server to listen on.")] = 8888,
    debug: Annotated[bool, typer.Option(help="Whether to run the server in debug mode.")] = False,
    encrypt_responses: Annotated[
        bool,
        typer.Option(
            "-e/-E",
            "--encrypt-responses/--no-encrypt-responses",
            help="Whether to encrypt responses. It is recommended to only disable encryption for debugging purposes.",
        ),
    ] = True,
    delay_responses_duration: Annotated[
        float, typer.Option("-d", "--delay-responses-duration", help="Duration to delay responses, in seconds.")
    ] = 0,
):
    """
    Start API server.

    This starts the API server.
    """

    # Set environment variables
    if debug:
        warnings.warn("Debug mode is enabled.", RuntimeWarning)
        os.environ["EXCALIBUR_SERVER_DEBUG"] = "1"

    if not encrypt_responses:
        warnings.warn(
            "Encryption is disabled."
            "This WILL break any code that requires the response to be encrypted on the client side.",
            RuntimeWarning,
        )
        os.environ["EXCALIBUR_SERVER_ENCRYPT_RESPONSES"] = "0"

    os.environ["EXCALIBUR_SERVER_DELAY_RESPONSES"] = str(delay_responses_duration)

    # Make the folders
    os.makedirs(ROOT_FOLDER, exist_ok=True)
    os.makedirs(FILES_FOLDER, exist_ok=True)

    # Start server
    uvicorn.run(
        "excalibur_server.api.app:app",
        host=host,
        port=port,
        reload=debug,
        reload_dirs=[Path(__file__).parent.parent],
        reload_excludes=["examples/*"],
    )
