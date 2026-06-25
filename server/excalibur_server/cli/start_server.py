from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="start")
def start_server(
    host: Annotated[str, typer.Option("--host", "-h", help="Host for the server to listen on.")] = "localhost",
    port: Annotated[int, typer.Option("--port", "-p", help="Port for the server to listen on.")] = 52419,
    debug: Annotated[bool, typer.Option(help="Whether to run the server in debug mode.")] = False,
    encrypt_responses: Annotated[
        bool,
        typer.Option(
            "--encrypt-responses/--no-encrypt-responses",
            help="Whether to encrypt responses. It is recommended to only disable encryption for debugging purposes.",
        ),
    ] = True,
    enable_proof_of_possession: Annotated[
        bool,
        typer.Option(
            "--enable-proof-of-possession/--disable-proof-of-possession",
            "--enable-pop/--disable-pop",
            help="Whether to enable proof of possession (PoP) checking. "
            "It is recommended to only disable PoP checking for debugging purposes.",
        ),
    ] = True,
    delay: Annotated[
        tuple[int, int],
        typer.Option(
            "--delay",
            help=(
                "HTTP responses' delays, in milliseconds.\n\n"
                + "The first value is the incoming delay and the second value is the outgoing delay."
            ),
        ),
    ] = (0, 0),
    enable_cors_validation: Annotated[
        bool,
        typer.Option(
            "--enable-cors-validation/--disable-cors-validation",
            help="Whether to enable CORS validation. It is recommended to only disable CORS validation for debugging "
            "purposes (e.g., when using an Android emulator).",
        ),
    ] = True,
    log_to_console: Annotated[
        bool,
        typer.Option(
            "--log/--no-log",
            "-l/-L",
            help="Whether to enable logging to console.",
        ),
    ] = True,
    log_to_file: Annotated[
        bool,
        typer.Option(
            "--log-to-file/--no-log-to-file",
            "-f/-F",
            help="Whether to enable logging to file.",
        ),
    ] = True,
    cleanup_logs: Annotated[
        bool,
        typer.Option(
            "--cleanup-logs/--no-cleanup-logs",
            "--clean-up-logs/--no-clean-up-logs",
            "--clean-up/--no-clean-up",
            "-c/-C",
            help="Whether to clean up old log files.",
        ),
    ] = True,
):
    """
    Start API server.
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
    os.environ["EXCALIBUR_SERVER_ENABLE_CORS_VALIDATION"] = "1" if enable_cors_validation else "0"
    os.environ["EXCALIBUR_SERVER_ENABLE_POP"] = "1" if enable_proof_of_possession else "0"
    os.environ["EXCALIBUR_SERVER_DELAY_RESPONSES"] = f"{delay[0]},{delay[1]}"
    os.environ["EXCALIBUR_SERVER_LOG_TO_CONSOLE"] = "1" if log_to_console else "0"
    os.environ["EXCALIBUR_SERVER_LOG_TO_FILE"] = "1" if log_to_file else "0"

    # Make the folders
    os.makedirs(ROOT_FOLDER, exist_ok=True)
    os.makedirs(CONFIG.logging.directory, exist_ok=True)
    os.makedirs(CONFIG.storage.vault_folder, exist_ok=True)

    # Create fake user if it doesn't exist
    _create_fake_user()

    # Clean up logs
    if cleanup_logs:
        from excalibur_server.cli.logging import _cleanup_logs

        _cleanup_logs()

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
        workers=1,  # We do not support more than one worker
        ws="websockets",
        ws_ping_interval=30.0,
    )


def _create_fake_user():
    from excalibur_server.consts import FAKE_USER_UUID
    from excalibur_server.src.auth.enums import AuthProtocol
    from excalibur_server.src.auth.opaque.structures import RegistrationRecord
    from excalibur_server.src.db.operations import add_user
    from excalibur_server.src.db.tables import User
    from excalibur_server.src.users import get_user_from_id

    # Create fake user if it doesn't exist
    if not get_user_from_id(FAKE_USER_UUID):
        add_user(
            User(
                id=FAKE_USER_UUID,
                username=b"\x00" * 16,
                fsitem_id=FAKE_USER_UUID,
                keygen_algorithm="argon2d",
                auth_protocol=AuthProtocol.OPAQUE_3DH,
                registration_record=RegistrationRecord.FAKE.serialize(),
                vault_info="",
                auk_salt=b"\x00" * 32,
                key_enc=b"\x00" * 32,
            )
        )
