from pathlib import Path
from typing import Annotated

import typer

from excalibur_server.cli import app

PWA_SRC_DIR = Path(__file__).parent.parent.parent.parent / "app" / "dist"
PWA_DST_DIR = Path(__file__).parent.parent / "static" / "pwa"


@app.command(name="build", context_settings={"allow_extra_args": True, "ignore_unknown_options": True})
def build(
    pwa: Annotated[
        bool,
        typer.Option(
            "--pwa/--no-pwa",
            "--with-pwa/--without-pwa",
            help="Whether to include the PWA in the server distributable",
        ),
    ] = False,
    clean_up: Annotated[
        bool,
        typer.Option(
            "--clean-up/--no-clean-up",
            help="Whether to clean up the PWA directory after building. Only applies if `--pwa` is set",
        ),
    ] = True,
    ctx: typer.Context = ...,  # `uv build` options absorbed here
):
    """
    Builds the API server distributable.

    This command extends the options available to `uv build`. To see the full list of supported
    build options, use `uv build --help` (for concise help) or `uv help build` (for more details).
    """

    import shutil
    import subprocess

    if pwa:
        if not PWA_SRC_DIR.exists():
            typer.secho("Warning: PWA source directory does not exist. Skipping PWA build.", fg="yellow")
        else:
            if PWA_DST_DIR.exists():
                typer.secho("PWA directory already exists. Cleaning up...", fg="blue")
                shutil.rmtree(PWA_DST_DIR)

            typer.secho("Copying over PWA from app directory...", fg="blue")
            shutil.copytree(PWA_SRC_DIR, PWA_DST_DIR)
            typer.secho("PWA copied over.", fg="cyan")

    subprocess.call(["uv", "build", *ctx.args])

    if pwa and PWA_DST_DIR.exists():
        if clean_up:
            typer.secho("Cleaning up PWA directory...", fg="blue")
            shutil.rmtree(PWA_DST_DIR)
            typer.secho("PWA directory cleaned up.", fg="cyan")
        else:
            typer.secho("Skipping PWA cleanup.", fg="yellow")

    typer.secho("Build complete.", fg="green")
