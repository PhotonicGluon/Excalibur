import os
import warnings
from typing import Annotated

import typer

app = typer.Typer(help="Commands relating to the API endpoint.", no_args_is_help=True)


@app.command(name="start")
def start_api_server(
    host: Annotated[str, typer.Option(help="Host for the server to listen on.")] = "0.0.0.0",
    port: Annotated[int, typer.Option(help="Port for the server to listen on.")] = 8000,
    debug: Annotated[bool, typer.Option(help="Whether to run the server in debug mode.")] = False,
):
    """
    Starts the API server.
    """

    if debug:
        warnings.warn("Debug mode is enabled.", RuntimeWarning)
        os.environ["EXCALIBUR_SERVER_DEBUG"] = "1"

    from excalibur_server.main import start_server

    start_server(host, port, debug)


@app.command(name="reset")
def reset_api_server():
    """
    Resets the API server.
    """

    from excalibur_server.main import reset_server

    reset_server()


@app.command(name="test")
def run_tests(verbose: Annotated[int, typer.Option("--verbose", "-v", help="Verbosity level.", count=True)] = 0):
    import importlib.util
    import sys

    if not importlib.util.find_spec("pytest"):
        typer.secho("Error: `pytest` not found. Please install the developer dependencies.", fg="red")
        sys.exit(1)

    import pytest

    args = ["--maxfail", "0", "-rs"]
    if verbose > 0:
        args += ["-" + "v" * verbose]

    os.environ["EXCALIBUR_SERVER_DEBUG"] = "1"
    sys.exit(pytest.main(args=args))
