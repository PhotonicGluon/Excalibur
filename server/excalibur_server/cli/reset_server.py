import os
import shutil
from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="reset")
def reset_server(
    delete: Annotated[
        bool,
        typer.Option(
            "-y",
            "--yes",
            help="Whether to confirm the reset. This is required to prevent accidental resets.",
        ),
    ] = False,
):
    """
    Reset API server.

    This removes any user-created files and resets the server back to factory settings.
    """

    if not delete:
        delete = typer.confirm("Are you sure you want to reset the server?")

    if not delete:
        raise typer.Abort()

    _reset_server()

    typer.secho("Server reset.", fg="green")


def _reset_server():
    from excalibur_server.consts import ROOT_FOLDER

    # Remove the files folder
    if not os.path.exists(ROOT_FOLDER):
        return

    shutil.rmtree(
        ROOT_FOLDER,
        onerror=lambda _, path, exception_info: typer.secho(
            f"Failed to remove {path}: {exception_info[1]}", fg="yellow"
        ),
    )
