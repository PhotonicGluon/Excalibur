import typer

from excalibur_server.cli import app


@app.command(name="build", context_settings={"allow_extra_args": True, "ignore_unknown_options": True})
def build(
    ctx: typer.Context = ...,  # `uv build` options absorbed here
):
    """
    Builds the API server distributable.

    This command extends the options available to `uv build`. To see the full list of supported
    build options, use `uv build --help` (for concise help) or `uv help build` (for more details).
    """

    import subprocess

    subprocess.call(["uv", "build", *ctx.args])
    typer.secho("Build complete.", fg="green")
