from typing import Annotated

import typer

from excalibur_server.cli import app


@app.command(name="backup")
def create_backup(
    output: Annotated[str, typer.Option("--output", "-o", help="Output file path")] = "excalibur-files-backup.zip",
):
    """
    Create a backup of the Excalibur server files.
    """

    import zipfile

    from excalibur_server.consts import ROOT_FOLDER

    typer.echo("Creating backup of Excalibur server files")
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zip_file:
        for file in ROOT_FOLDER.iterdir():
            zip_file.write(file, file.name)

    typer.secho(f"Backup created successfully at '{output}'!", fg=typer.colors.GREEN)
