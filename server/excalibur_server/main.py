import os
import warnings

import uvicorn

from excalibur_server.consts import FILES_FOLDER, ROOT_FOLDER


def start_server(host: str, port: int, debug: bool, encrypt_responses: bool = True, delay_responses_duration: int = 0):
    """
    Starts the API server.

    :param host: Host for the server to listen on.
    :param port: Port for the server to listen on.
    :param debug: Whether to run the server in debug mode.
    :param encrypt_responses: Whether to encrypt responses. It is recommended to only disable
        encryption for debugging purposes.
    :param delay_responses_duration: Duration to delay responses, in seconds.
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
        reload_dirs=[os.path.dirname(__file__)],
        reload_excludes=["examples/*"],
    )


def reset_server():
    """
    Resets the API server.
    """

    # Remove the files folder
    if os.path.exists(ROOT_FOLDER):
        os.rmdir(ROOT_FOLDER)
