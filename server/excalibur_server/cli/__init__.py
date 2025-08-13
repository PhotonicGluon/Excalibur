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


from .init_server import init_server as init_server
from .setup_server import setup_server as setup_server
from .start_server import start_server as start_server
from .reset_server import reset_server as reset_server

# Since tests may be excluded from the build, we need to handle the import like this
try:
    from .run_tests import run_tests as run_tests
except ImportError:
    pass


__all__ = ["app"]
