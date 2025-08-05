import os
import shutil
from typing import Annotated

import typer

from excalibur_server.cli import app
from excalibur_server.consts import ROOT_FOLDER


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

    # Remove the files folder
    if os.path.exists(ROOT_FOLDER):
        shutil.rmtree(ROOT_FOLDER)

    typer.secho("Server reset.", fg="green")
