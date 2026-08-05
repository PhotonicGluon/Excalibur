from pathlib import Path
from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="test")
def run_tests(
    verbose: Annotated[int, typer.Option("--verbose", "-v", help="Verbosity level.", count=True)] = 0,
    files: Annotated[
        list[Path] | None, typer.Argument(exists=True, help="Files to run tests on. Leave empty to run all tests.")
    ] = None,
):
    """
    Run tests.

    This runs the tests for the API server. Used for development only.
    """

    import importlib.util

    if not importlib.util.find_spec("pytest"):
        typer.secho("Error: `pytest` not found. Please install the developer dependencies.", fg="red")
        raise typer.Exit(1)

    import os
    import subprocess

    from excalibur_server.cli.init_server import init_server

    init_server(reset=False, with_db=False)

    args = ["--maxfail", "0", "-rs", "--timeout", "5", "--session-timeout", "300"]
    if verbose > 0:
        args += ["-" + "v" * verbose]
    if files:
        args += [str(file) for file in files]

    os.environ["EXCALIBUR_SERVER_DEBUG"] = "1"
    raise typer.Exit(subprocess.call(["pytest", *args]))
