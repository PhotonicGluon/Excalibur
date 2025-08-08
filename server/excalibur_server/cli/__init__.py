# ruff: noqa: E402
# isort: skip_file
from pathlib import Path
from typing import Annotated

import typer
from alembic.config import Config

CLI_DIR = Path(__file__).parent

app = typer.Typer(no_args_is_help=True, invoke_without_command=True)


# Add a callback to handle the `--version` option
@app.callback()
def main(version: Annotated[bool, typer.Option("--version", "-v", help="Show Excalibur's version and exit.")] = False):
    """
    Commands relating to the API endpoint.
    """

    if version:
        from importlib import metadata

        typer.echo(metadata.version("excalibur-server"))


# Add a function to get the Alembic config
def get_alembic_config() -> Config:
    """
    Gets the Alembic configuration used by Excalibur.
    """

    return Config(CLI_DIR.parent / "alembic.ini")


# Add other typer apps
from .db import db_app

app.add_typer(db_app, name="db")

# Expose other commands
from .init_server import init_server as init_server
from .setup_server import setup_server as setup_server
from .start_server import start_server as start_server
from .reset_server import reset_server as reset_server
from .run_tests import run_tests as run_tests


__all__ = ["app"]
