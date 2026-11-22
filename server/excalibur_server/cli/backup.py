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

    from rich.progress import BarColumn, MofNCompleteColumn, Progress, TextColumn, TimeRemainingColumn

    from excalibur_server.consts import ROOT_FOLDER

    typer.secho("Finding files to back up...", nl=False, fg=typer.colors.YELLOW)
    count = len([item for item in ROOT_FOLDER.rglob("*") if item.is_file()])
    typer.secho("done.\n", fg=typer.colors.GREEN)

    with Progress(
        MofNCompleteColumn(), BarColumn(), TimeRemainingColumn(), TextColumn("{task.description}")
    ) as progress:
        task = progress.add_task("Creating backup...", total=count)
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_path in ROOT_FOLDER.rglob("*"):
                if file_path.is_file():
                    arcpath = file_path.relative_to(ROOT_FOLDER)
                    progress.update(task, description=str(arcpath), advance=1)
                    zf.write(file_path, arcname=arcpath)
        progress.update(task, description="Done!\n")

    typer.secho(f"Backup created successfully at '{output}'!", fg=typer.colors.GREEN)
