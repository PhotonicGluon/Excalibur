# ruff: noqa: E402
# isort: skip_file
from pathlib import Path
from typing import Annotated

import typer
from alembic.config import Config

from excalibur_server.meta import VERSION

CLI_DIR = Path(__file__).parent

app = typer.Typer(no_args_is_help=True, invoke_without_command=True)

ASCII_BANNER = """\
  ________   _______          _      _____ ____  _    _ _____  
 |  ____\ \ / / ____|   /\   | |    |_   _|  _ \| |  | |  __ \ 
 | |__   \ V / |       /  \  | |      | | | |_) | |  | | |__) |
 |  __|   > <| |      / /\ \ | |      | | |  _ <| |  | |  _  / 
 | |____ / . \ |____ / ____ \| |____ _| |_| |_) | |__| | | \ \ 
 |______/_/ \_\_____/_/    \_\______|_____|____/ \____/|_|  \_\ \
"""


def _print_banner():
    typer.secho(ASCII_BANNER, fg="blue")
    typer.secho(f"Excalibur Server {VERSION}", fg="cyan")
    typer.echo()


# Add a callback to handle the `--version` option
@app.callback()
def main(version: Annotated[bool, typer.Option("--version", "-v", help="Show Excalibur's version and exit.")] = False):
    """
    Commands relating to the API endpoint.
    """

    if version:
        from importlib import metadata

        typer.echo(metadata.version("excalibur-server"))
    else:
        _print_banner()


# Add a function to get the Alembic config
def get_alembic_config() -> Config:
    """
    Gets the Alembic configuration used by Excalibur.
    """

    return Config(CLI_DIR.parent / "alembic.ini")


# Add other typer apps
from .db import db_app
from .user import user_app

app.add_typer(db_app, name="db")
app.add_typer(user_app, name="user")

# Expose other commands
from .init_server import init_server as init_server
from .start_server import start_server as start_server
from .reset_server import reset_server as reset_server

# Handle possibly excluded commands
try:
    from .build import build as build
except ImportError:
    pass

try:
    from .run_tests import run_tests as run_tests
except ImportError:
    pass

__all__ = ["app"]
