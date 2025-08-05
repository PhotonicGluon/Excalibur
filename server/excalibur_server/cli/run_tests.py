import os
from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="test")
def run_tests(verbose: Annotated[int, typer.Option("--verbose", "-v", help="Verbosity level.", count=True)] = 0):
    """
    Run tests.

    This runs the tests for the API server. Used for development only.
    """

    import importlib.util

    if not importlib.util.find_spec("pytest"):
        typer.secho("Error: `pytest` not found. Please install the developer dependencies.", fg="red")
        typer.Exit(1)

    import subprocess

    args = ["--maxfail", "0", "-rs"]
    if verbose > 0:
        args += ["-" + "v" * verbose]

    os.environ["EXCALIBUR_SERVER_DEBUG"] = "1"
    typer.Exit(subprocess.call(["pytest", *args]))
