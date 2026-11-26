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

    from rich.console import Console
    from rich.progress import BarColumn, MofNCompleteColumn, Progress, TextColumn, TimeRemainingColumn

    from excalibur_server.consts import ROOT_FOLDER

    console = Console()

    with console.status("Finding items to back up..."):
        files = sorted([item for item in ROOT_FOLDER.rglob("*") if item.is_file()])
        count = len(files)

    console.print(f"Found [bold]{count}[/bold] files to back up.\n")

    with Progress(
        MofNCompleteColumn(), BarColumn(), TimeRemainingColumn(), TextColumn("{task.description}")
    ) as progress:
        task = progress.add_task("Creating backup...", total=count)
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as zf:
            for file in files:
                arcpath = file.relative_to(ROOT_FOLDER)
                progress.update(task, description=str(arcpath), advance=1)
                zf.write(file, arcname=arcpath)
        progress.update(task, description="Done!\n")

    typer.secho(f"Backup created successfully at '{output}'!", fg=typer.colors.GREEN)
