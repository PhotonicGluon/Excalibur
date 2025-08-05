# ruff: noqa: E402
# isort: skip_file
import typer
from typing import Annotated

app = typer.Typer(no_args_is_help=True, invoke_without_command=True)


@app.callback()
def main(version: Annotated[bool, typer.Option("--version", "-v", help="Show Excalibur's version and exit.")] = False):
    """
    Commands relating to the API endpoint.
    """

    if version:
        from importlib import metadata

        typer.echo(metadata.version("excalibur-server"))


from .start_server import start_server as start_server
from .reset_server import reset_server as reset_server
from .run_tests import run_tests as run_tests


__all__ = ["app"]
