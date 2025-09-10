from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="start")
def start_server(
    host: Annotated[str, typer.Option(help="Host for the server to listen on.")] = "0.0.0.0",
    port: Annotated[int, typer.Option(help="Port for the server to listen on.")] = 8888,
    debug: Annotated[bool, typer.Option(help="Whether to run the server in debug mode.")] = False,
    encrypt_responses: Annotated[
        bool,
        typer.Option(
            "--encrypt-responses/--no-encrypt-responses",
            "-e/-E",
            help="Whether to encrypt responses. It is recommended to only disable encryption for debugging purposes.",
        ),
    ] = True,
    delay_responses_duration: Annotated[
        float, typer.Option("--delay", "-d", help="Duration to delay responses, in seconds.")
    ] = 0,
    enable_cors: Annotated[
        bool,
        typer.Option(
            "--enable-cors/--disable-cors",
            "-c/-C",
            help="Whether to enable CORS. It is recommended to only disable CORS for debugging purposes "
            "(e.g., when using an Android emulator).",
        ),
    ] = True,
    enable_logging: Annotated[
        bool,
        typer.Option(
            "--logging/--no-logging",
            "-l/-L",
            help="Whether to enable logging to file.",
        ),
    ] = True,
):
    """
    Start API server.

    This starts the API server.
    """

    import os
    from pathlib import Path

    import uvicorn
    from uvicorn.config import LOGGING_CONFIG

    from excalibur_server.consts import ROOT_FOLDER
    from excalibur_server.src.config import CONFIG

    # Set environment variables
    os.environ["EXCALIBUR_SERVER_DEBUG"] = "1" if debug else "0"
    os.environ["EXCALIBUR_SERVER_ENCRYPT_RESPONSES"] = "0" if not encrypt_responses else "1"
    os.environ["EXCALIBUR_SERVER_ENABLE_CORS"] = "1" if enable_cors else "0"
    os.environ["EXCALIBUR_SERVER_DELAY_RESPONSES"] = str(delay_responses_duration)
    os.environ["EXCALIBUR_SERVER_LOGGING"] = "1" if enable_logging else "0"

    # Make the folders
    os.makedirs(ROOT_FOLDER, exist_ok=True)
    os.makedirs(CONFIG.logging.directory, exist_ok=True)
    os.makedirs(CONFIG.storage.vault_folder, exist_ok=True)

    # Configure log format
    log_config = LOGGING_CONFIG
    formatters = log_config["formatters"]
    formatters["default"]["fmt"] = CONFIG.logging.format.default
    formatters["access"]["fmt"] = CONFIG.logging.format.access

    # Start server
    uvicorn.run(
        "excalibur_server.api.app:app",
        host=host,
        port=port,
        log_config=log_config,
        reload=debug,
        reload_dirs=[Path(__file__).parent.parent],
        reload_excludes=["test_*.py"],
    )
